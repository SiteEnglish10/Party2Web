import { RiseOutlined } from "@ant-design/icons";
import { Card, Typography } from "antd";
import { useTranslation } from "react-i18next";

import type { Tool } from "../api";
import { ToolIcon } from "../icons";

export default function ToolCard({
  tool,
  rank,
  onClick,
}: {
  tool: Tool;
  rank?: number;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div style={{ position: "relative", height: "100%" }}>
      {rank !== undefined && <span className="rank-badge">{rank}</span>}
      <Card className="tool-card" size="small" onClick={onClick} styles={{ body: { padding: 14 } }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 92 }}>
          <ToolIcon name={tool.icon} className="tool-icon" />
          <Typography.Text strong ellipsis style={{ fontSize: 14 }}>
            {tool.name}
          </Typography.Text>
          <Typography.Paragraph
            type="secondary"
            ellipsis={{ rows: 2 }}
            style={{ fontSize: 12, margin: 0, minHeight: 32 }}
          >
            {tool.desc}
          </Typography.Paragraph>
          <div style={{ marginTop: "auto", fontSize: 11, color: "#999" }}>
            <RiseOutlined /> {t("tools.usage", { count: tool.usage })}
          </div>
        </div>
      </Card>
    </div>
  );
}
