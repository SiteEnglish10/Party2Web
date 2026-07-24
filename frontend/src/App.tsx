import {
  AppstoreOutlined,
  GlobalOutlined,
  HeartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, Tag, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { api } from "./api";
import SettingsModal from "./components/SettingsModal";
import SharePage from "./pages/SharePage";
import SponsorPage from "./pages/SponsorPage";
import ToolsPage from "./pages/ToolsPage";
import { useStore } from "./store";

const { Sider, Content } = Layout;

export default function App() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { isAdmin, lang, setLang, site, setSite } = useStore();

  useEffect(() => {
    api.site().then(setSite).catch(() => {});
  }, [lang, setSite]);

  const current = loc.pathname === "/" ? "/tools" : loc.pathname;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        trigger={null}
        collapsed={collapsed}
        theme="light"
        width={220}
        style={{ borderRight: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          {/* 顶部：展开/收起按钮（收起时居中，与下方菜单图标对齐）+ 站点名 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 8,
              padding: collapsed ? "12px 0" : "12px 12px",
              minHeight: 56,
            }}
          >
            <Tooltip title={collapsed ? t("nav.expand") : t("nav.collapse")} placement="right">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
              />
            </Tooltip>
            {!collapsed && (
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {site?.site_name || "便利工具站"}
                </div>
                {site?.location && (
                  <div style={{ fontSize: 11, color: "#999", whiteSpace: "nowrap" }}>{site.location}</div>
                )}
              </div>
            )}
          </div>
          {isAdmin && !collapsed && (
            <Tag color="blue" style={{ margin: "0 12px 6px", width: "fit-content" }}>
              {t("admin.on")}
            </Tag>
          )}

          <Menu
            mode="inline"
            selectedKeys={[current]}
            onClick={(e) => nav(e.key)}
            items={[
              { key: "/tools", icon: <AppstoreOutlined />, label: t("nav.tools") },
              { key: "/share", icon: <MessageOutlined />, label: t("nav.share") },
              { key: "/sponsor", icon: <HeartOutlined />, label: t("nav.sponsor") },
            ]}
          />

          {/* 底部：语言切换 + 设置（替代原来的展开/收起按钮位置） */}
          <div
            style={{
              marginTop: "auto",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: collapsed ? "center" : "stretch",
            }}
          >
            <Tooltip title={t("settings.language")} placement="right">
              <Button
                block={!collapsed}
                icon={<GlobalOutlined />}
                onClick={() => setLang(lang === "zh" ? "en" : "zh")}
              >
                {!collapsed && (lang === "zh" ? "English" : "中文")}
              </Button>
            </Tooltip>
            <Tooltip title={t("nav.settings")} placement="right">
              <Button
                block={!collapsed}
                type={isAdmin ? "primary" : "default"}
                icon={<SettingOutlined />}
                onClick={() => setSettingsOpen(true)}
              >
                {!collapsed && t("nav.settings")}
              </Button>
            </Tooltip>
          </div>
        </div>
      </Sider>

      <Layout>
        <Content style={{ padding: 24, maxWidth: 1200, width: "100%", margin: "0 auto" }}>
          <Routes>
            <Route path="/" element={<Navigate to="/tools" replace />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/share" element={<SharePage />} />
            <Route path="/sponsor" element={<SponsorPage />} />
          </Routes>
        </Content>
      </Layout>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Layout>
  );
}
