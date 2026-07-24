import { Alert, Modal, Space } from "antd";
import { useTranslation } from "react-i18next";

import { api, type Tool } from "../api";
import { RUNNERS } from "../tools/runners";

export default function ToolModal({
  tool,
  onClose,
  onUsed,
}: {
  tool: Tool | null;
  onClose: () => void;
  onUsed: (id: number, usage: number) => void;
}) {
  const { t } = useTranslation();
  if (!tool) return null;

  const Runner = RUNNERS[tool.tool_type];

  const handleSuccess = async () => {
    try {
      const res = await api.recordUse(tool.id);
      onUsed(tool.id, res.usage);
    } catch {
      /* 统计失败不阻塞用户 */
    }
  };

  return (
    <Modal
      open={!!tool}
      onCancel={onClose}
      title={tool.name}
      footer={null}
      destroyOnClose
      width={780}
      styles={{
        content: {
          resize: "both",
          overflow: "auto",
          minWidth: 480,
          minHeight: 440,
          maxWidth: "96vw",
          maxHeight: "92vh",
        },
      }}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div style={{ color: "#888" }}>{tool.desc}</div>
        {tool.runtime === "front" && <Alert type="success" showIcon message={t("tools.runLocal")} />}
        {Runner ? (
          <Runner tool={tool} onSuccess={handleSuccess} />
        ) : (
          <Alert type="info" message={`未实现的工具类型: ${tool.tool_type}`} />
        )}
      </Space>
    </Modal>
  );
}
