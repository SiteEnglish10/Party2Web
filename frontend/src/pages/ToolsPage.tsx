import {
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Button,
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Segmented,
  Space,
  Spin,
  Tooltip,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { api, type Category, type Tool } from "../api";
import CategoryEditModal from "../components/CategoryEditModal";
import ToolCard from "../components/ToolCard";
import ToolEditModal from "../components/ToolEditModal";
import ToolModal from "../components/ToolModal";
import { useStore } from "../store";

const { Title } = Typography;

export default function ToolsPage() {
  const { t } = useTranslation();
  const { isAdmin, lang } = useStore();
  const [cats, setCats] = useState<Category[]>([]);
  const [recommended, setRecommended] = useState<Tool[]>([]);
  const [range, setRange] = useState("all");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Tool[] | null>(null);
  const [active, setActive] = useState<Tool | null>(null);

  // admin modals
  const [toolModal, setToolModal] = useState<{ tool: Tool | null; catId?: number } | null>(null);
  const [catModal, setCatModal] = useState<{ cat: Category | null } | null>(null);
  const copyRef = useRef(false);

  const loadCats = useCallback(() => api.categories().then(setCats), []);
  const loadRec = useCallback(() => api.recommended(range).then(setRecommended), [range]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCats(), loadRec()]).finally(() => setLoading(false));
  }, [lang, loadCats, loadRec]);

  useEffect(() => {
    loadRec();
  }, [range, loadRec]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => (copyRef.current = e.ctrlKey || e.altKey || e.metaKey);
    window.addEventListener("keydown", h);
    window.addEventListener("keyup", h);
    return () => {
      window.removeEventListener("keydown", h);
      window.removeEventListener("keyup", h);
    };
  }, []);

  // 搜索（防抖）
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    const id = setTimeout(() => api.search(q).then(setResults), 300);
    return () => clearTimeout(id);
  }, [query, lang]);

  const onUsed = (id: number, usage: number) => {
    setCats((cs) =>
      cs.map((c) => ({ ...c, tools: c.tools.map((tl) => (tl.id === id ? { ...tl, usage } : tl)) })),
    );
    loadRec();
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const parseId = (id: string) => {
    if (id.startsWith("cat:")) return { cat: Number(id.slice(4)), tool: null as number | null };
    const [c, tl] = id.split(":").map(Number);
    return { cat: c, tool: tl };
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active: a, over } = e;
    if (!over) return;
    const src = parseId(String(a.id));
    const dst = parseId(String(over.id));
    if (src.tool == null) return;

    if (src.cat === dst.cat) {
      // 同类排序
      const cat = cats.find((c) => c.id === src.cat);
      if (!cat) return;
      const ids = cat.tools.map((tl) => tl.id);
      const from = ids.indexOf(src.tool);
      const to = dst.tool != null ? ids.indexOf(dst.tool) : ids.length - 1;
      if (from === to || from < 0) return;
      const next = [...ids];
      next.splice(to, 0, next.splice(from, 1)[0]);
      setCats((cs) =>
        cs.map((c) =>
          c.id === cat.id
            ? { ...c, tools: next.map((tid) => c.tools.find((x) => x.id === tid)!) }
            : c,
        ),
      );
      await api.reorderTools(cat.id, next);
    } else {
      // 跨类：移动 / 复制
      const mode = copyRef.current ? "copy" : "move";
      await api.assignTool(src.tool, dst.cat, mode, mode === "move" ? src.cat : undefined);
      message.success(mode === "copy" ? "已复制 / Copied" : "已移动 / Moved");
      await loadCats();
    }
  };

  if (loading) return <Spin style={{ display: "block", margin: "80px auto" }} />;

  return (
    <div>
      <Input.Search
        size="large"
        allowClear
        placeholder={t("tools.searchPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 24 }}
      />

      {results !== null ? (
        <>
          <Title level={4}>{t("tools.searchResults")}</Title>
          {results.length === 0 ? (
            <Empty description={t("tools.noResults")} />
          ) : (
            <Row gutter={[12, 12]}>
              {results.map((tl) => (
                <Col key={tl.id} xs={12} sm={8} md={6} lg={4} xl={4}>
                  <ToolCard tool={tl} onClick={() => setActive(tl)} />
                </Col>
              ))}
            </Row>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Title level={4} style={{ margin: 0 }}>
              🔥 {t("tools.recommended")}
            </Title>
            <Segmented
              value={range}
              onChange={(v) => setRange(v as string)}
              options={[
                { label: t("tools.range.all"), value: "all" },
                { label: t("tools.range.7d"), value: "7d" },
                { label: t("tools.range.30d"), value: "30d" },
                { label: t("tools.range.365d"), value: "365d" },
              ]}
            />
          </div>
          {recommended.length === 0 ? (
            <Empty description={t("tools.empty")} style={{ margin: "24px 0" }} />
          ) : (
            <Row gutter={[12, 12]} style={{ marginBottom: 32 }}>
              {recommended.map((tl, i) => (
                <Col key={tl.id} xs={12} sm={8} md={6} lg={4} xl={4}>
                  <ToolCard tool={tl} rank={i + 1} onClick={() => setActive(tl)} />
                </Col>
              ))}
            </Row>
          )}

          {isAdmin && (
            <div style={{ marginBottom: 16 }}>
              <Button icon={<PlusOutlined />} onClick={() => setCatModal({ cat: null })}>
                {t("admin.newCategory")}
              </Button>
              <Typography.Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                {t("admin.moveCopyHint")}
              </Typography.Text>
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
            {cats.map((cat) => (
              <CategorySection
                key={cat.id}
                cat={cat}
                isAdmin={isAdmin}
                onOpen={(tl) => setActive(tl)}
                onEditCat={() => setCatModal({ cat })}
                onDeleteCat={async () => {
                  await api.deleteCategory(cat.id);
                  loadCats();
                }}
                onAddTool={() => setToolModal({ tool: null, catId: cat.id })}
                onEditTool={(tl) => setToolModal({ tool: tl, catId: cat.id })}
                onDeleteTool={async (tl) => {
                  await api.deleteTool(tl.id);
                  loadCats();
                }}
              />
            ))}
          </DndContext>
        </>
      )}

      <ToolModal tool={active} onClose={() => setActive(null)} onUsed={onUsed} />

      {toolModal && (
        <ToolEditModal
          open
          tool={toolModal.tool}
          categoryId={toolModal.catId}
          onClose={() => setToolModal(null)}
          onSaved={loadCats}
        />
      )}
      {catModal && (
        <CategoryEditModal
          open
          category={catModal.cat}
          onClose={() => setCatModal(null)}
          onSaved={loadCats}
        />
      )}
    </div>
  );
}

// ---------- 分类分区 ----------
function CategorySection({
  cat,
  isAdmin,
  onOpen,
  onEditCat,
  onDeleteCat,
  onAddTool,
  onEditTool,
  onDeleteTool,
}: {
  cat: Category;
  isAdmin: boolean;
  onOpen: (t: Tool) => void;
  onEditCat: () => void;
  onDeleteCat: () => void;
  onAddTool: () => void;
  onEditTool: (t: Tool) => void;
  onDeleteTool: (t: Tool) => void;
}) {
  const { t } = useTranslation();
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Title level={5} style={{ margin: 0 }}>
          {cat.name}
        </Title>
        {isAdmin && (
          <Space size="small">
            <Button size="small" icon={<EditOutlined />} onClick={onEditCat} />
            <Popconfirm title={t("admin.confirmDelete")} onConfirm={onDeleteCat}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
            <Button size="small" icon={<PlusOutlined />} onClick={onAddTool}>
              {t("admin.addTool")}
            </Button>
          </Space>
        )}
      </div>
      <SortableContext
        items={cat.tools.map((tl) => `${cat.id}:${tl.id}`)}
        strategy={rectSortingStrategy}
        disabled={!isAdmin}
      >
        <div id={`cat:${cat.id}`}>
          <Row gutter={[12, 12]}>
            {cat.tools.map((tl) =>
              isAdmin ? (
                <Col key={tl.id} xs={12} sm={8} md={6} lg={4} xl={4}>
                  <SortableTool
                    cat={cat}
                    tool={tl}
                    onOpen={() => onOpen(tl)}
                    onEdit={() => onEditTool(tl)}
                    onDelete={() => onDeleteTool(tl)}
                  />
                </Col>
              ) : (
                <Col key={tl.id} xs={12} sm={8} md={6} lg={4} xl={4}>
                  <ToolCard tool={tl} onClick={() => onOpen(tl)} />
                </Col>
              ),
            )}
            {cat.tools.length === 0 && (
              <Col span={24}>
                <Empty description={t("tools.empty")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </Col>
            )}
          </Row>
        </div>
      </SortableContext>
    </div>
  );
}

// ---------- 可拖拽工具卡 ----------
function SortableTool({
  cat,
  tool,
  onOpen,
  onEdit,
  onDelete,
}: {
  cat: Category;
  tool: Tool;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${cat.id}:${tool.id}`,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 4, right: 4, zIndex: 3, display: "flex", gap: 2 }}>
        <Tooltip title={t("tools.reorderHint")}>
          <Button size="small" type="text" icon={<HolderOutlined />} {...attributes} {...listeners} />
        </Tooltip>
        <Button size="small" type="text" icon={<EditOutlined />} onClick={onEdit} />
        <Popconfirm title={t("admin.confirmDelete")} onConfirm={onDelete}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </div>
      <ToolCard tool={tool} onClick={onOpen} />
    </div>
  );
}
