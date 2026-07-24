import { Button, Divider, Form, Input, Modal, Segmented, Switch, message } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "../api";
import { useStore } from "../store";

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { isAdmin, setToken, lang, setLang } = useStore();
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onToggle = (checked: boolean) => {
    if (!checked) {
      setToken(null);
      message.success(t("settings.logout"));
      setShowLogin(false);
    } else {
      setShowLogin(true);
    }
  };

  const doLogin = async () => {
    try {
      const { username, password } = await form.validateFields();
      setLoading(true);
      const res = await api.login(username, password);
      setToken(res.token);
      message.success(t("settings.loggedIn"));
      setShowLogin(false);
      form.resetFields();
    } catch (e: any) {
      if (e?.response) message.error(t("settings.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onCancel={onClose} title={t("settings.title")} footer={null}>
      <Divider orientation="left" plain>
        {t("settings.language")}
      </Divider>
      <Segmented
        value={lang}
        onChange={(v) => setLang(v as "zh" | "en")}
        options={[
          { label: "中文", value: "zh" },
          { label: "English", value: "en" },
        ]}
      />

      <Divider orientation="left" plain>
        {t("settings.adminMode")}
      </Divider>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#888", fontSize: 13 }}>{t("settings.adminHint")}</span>
        <Switch checked={isAdmin} onChange={onToggle} />
      </div>

      {showLogin && !isAdmin && (
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} onFinish={doLogin}>
          <Form.Item name="username" label={t("settings.username")} rules={[{ required: true }]}>
            <Input autoComplete="off" placeholder="root" />
          </Form.Item>
          <Form.Item name="password" label={t("settings.password")} rules={[{ required: true }]}>
            <Input.Password autoComplete="off" onPressEnter={doLogin} />
          </Form.Item>
          <Button type="primary" block loading={loading} onClick={doLogin}>
            {t("settings.login")}
          </Button>
        </Form>
      )}
    </Modal>
  );
}
