import { DeleteOutlined, EditOutlined, NotificationOutlined, PlusOutlined, RightOutlined } from "@ant-design/icons";
import { Button, Card, Empty, List, Modal, Popconfirm, Space } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { api, type Announcement } from "../api";
import { useStore } from "../store";
import AnnouncementEditModal from "./AnnouncementEditModal";

export default function AnnouncementsPanel() {
  const { t } = useTranslation();
  const { isAdmin, lang } = useStore();
  const [items, setItems] = useState<Announcement[]>([]);
  const [detail, setDetail] = useState<Announcement | null>(null);
  const [edit, setEdit] = useState<{ item: Announcement | null } | null>(null);

  const load = () => api.announcements().then(setItems);
  useEffect(() => {
    load();
  }, [lang]);

  return (
    <Card
      title={
        <Space>
          <NotificationOutlined />
          {t("share.announcements")}
        </Space>
      }
      extra={
        isAdmin && (
          <Button size="small" icon={<PlusOutlined />} onClick={() => setEdit({ item: null })}>
            {t("admin.newAnnouncement")}
          </Button>
        )
      }
      style={{ height: "100%" }}
    >
      {items.length === 0 ? (
        <Empty description={t("share.noAnnouncements")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={items}
          renderItem={(a) => (
            <List.Item
              actions={
                isAdmin
                  ? [
                      <Button key="e" size="small" type="text" icon={<EditOutlined />} onClick={() => setEdit({ item: a })} />,
                      <Popconfirm key="d" title={t("admin.confirmDelete")} onConfirm={async () => { await api.deleteAnnouncement(a.id); load(); }}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]
                  : [<RightOutlined key="r" style={{ color: "#bbb" }} />]
              }
              style={{ cursor: "pointer" }}
            >
              <List.Item.Meta
                title={<a onClick={() => setDetail(a)}>{a.title}</a>}
                description={new Date(a.created_at).toLocaleDateString()}
              />
            </List.Item>
          )}
        />
      )}

      <Modal open={!!detail} title={detail?.title} footer={null} onCancel={() => setDetail(null)} width={640}>
        <div style={{ color: "#999", marginBottom: 12 }}>
          {detail && new Date(detail.created_at).toLocaleString()}
        </div>
        <div className="comment-body" dangerouslySetInnerHTML={{ __html: detail?.body || "" }} />
      </Modal>

      {edit && (
        <AnnouncementEditModal open item={edit.item} onClose={() => setEdit(null)} onSaved={load} />
      )}
    </Card>
  );
}
