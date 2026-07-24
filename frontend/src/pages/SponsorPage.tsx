import { EditOutlined, HeartFilled, UploadOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Modal, Progress, Space, Tabs, Upload, message } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "../api";
import RichEditor from "../components/RichEditor";
import { useStore } from "../store";

function fmt(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

export default function SponsorPage() {
  const { t } = useTranslation();
  const { isAdmin, lang, setSite } = useStore();
  const [data, setData] = useState<any>(null);
  const [editText, setEditText] = useState(false);
  const [editSite, setEditSite] = useState(false);
  const [textForm] = Form.useForm();
  const [siteForm] = Form.useForm();

  const load = () => api.sponsor().then(setData);
  useEffect(() => {
    load();
  }, [lang]);

  if (!data) return null;
  const tr = data.traffic;
  const usedPct = tr.limit_bytes > 0 ? Math.min(100, Math.round((tr.used_bytes / tr.limit_bytes) * 100)) : 0;

  const saveText = async () => {
    const v = await textForm.validateFields();
    await api.updateSponsor(v);
    message.success(t("admin.saved"));
    setEditText(false);
    load();
  };

  const saveSite = async () => {
    const v = await siteForm.validateFields();
    v.traffic_limit_gb = Number(v.traffic_limit_gb) || 300;
    const updated = await api.updateSite(v);
    setSite(updated);
    message.success(t("admin.saved"));
    setEditSite(false);
    load();
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
      <h2 style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
        <HeartFilled style={{ color: "#eb5c5c" }} /> {t("sponsor.thanks")}
      </h2>

      <div
        className="comment-body"
        style={{ color: "#666", margin: "0 auto 20px", maxWidth: 520 }}
        dangerouslySetInnerHTML={{ __html: data.sponsor_text || "" }}
      />
      {isAdmin && (
        <Button
          icon={<EditOutlined />}
          size="small"
          style={{ marginBottom: 20 }}
          onClick={() => {
            textForm.setFieldsValue({
              sponsor_text_zh: data.sponsor_text_zh,
              sponsor_text_en: data.sponsor_text_en,
            });
            setEditText(true);
          }}
        >
          {t("admin.editSponsor")}
        </Button>
      )}

      <Card style={{ marginBottom: 24, textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <b>{t("sponsor.trafficThisMonth")}</b>
          <span style={{ color: "#999" }}>{t("sponsor.total", { gb: tr.limit_gb })}</span>
        </div>
        <Progress percent={usedPct} strokeColor="#2f6db0" />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "#2f6db0" }}>
            {t("sponsor.used")} {fmt(tr.used_bytes)}
          </span>
          <span style={{ color: "#2f8a5b" }}>
            {t("sponsor.remaining")} {fmt(tr.remaining_bytes)}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#aaa", marginTop: 6 }}>{t("sponsor.trafficNote")}</div>
      </Card>

      <div style={{ fontWeight: 600, marginBottom: 12 }}>{t("sponsor.qrTitle")}</div>
      {data.sponsor_qr_url ? (
        <img src={data.sponsor_qr_url} alt="QR" style={{ width: 200, borderRadius: 8 }} />
      ) : (
        <div style={{ color: "#bbb" }}>{t("sponsor.noQr")}</div>
      )}

      {isAdmin && (
        <div style={{ marginTop: 20 }}>
          <Space>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={async (file) => {
                await api.uploadQr(file as File);
                message.success(t("admin.saved"));
                load();
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>{t("admin.changeQr")}</Button>
            </Upload>
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                siteForm.setFieldsValue({
                  site_name: useStore.getState().site?.site_name,
                  location: useStore.getState().site?.location,
                  traffic_limit_gb: data.traffic_limit_gb,
                });
                setEditSite(true);
              }}
            >
              {t("admin.siteInfo")}
            </Button>
          </Space>
        </div>
      )}

      <Modal open={editText} title={t("admin.editSponsor")} onCancel={() => setEditText(false)} onOk={saveText} width={640}>
        <Form form={textForm} layout="vertical">
          <Tabs
            items={[
              { key: "zh", label: "中文", children: <Form.Item name="sponsor_text_zh"><RichEditor /></Form.Item> },
              { key: "en", label: "English", children: <Form.Item name="sponsor_text_en"><RichEditor /></Form.Item> },
            ]}
          />
        </Form>
      </Modal>

      <Modal open={editSite} title={t("admin.siteInfo")} onCancel={() => setEditSite(false)} onOk={saveSite}>
        <Form form={siteForm} layout="vertical">
          <Form.Item name="site_name" label={t("admin.siteName")} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="location" label={t("admin.location")}>
            <Input />
          </Form.Item>
          <Form.Item name="traffic_limit_gb" label={t("admin.trafficLimit")}>
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
