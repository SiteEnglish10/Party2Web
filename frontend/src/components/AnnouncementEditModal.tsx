import { Form, Input, Modal, Tabs } from "antd";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { api, type Announcement } from "../api";
import RichEditor from "./RichEditor";

export default function AnnouncementEditModal({
  open,
  item,
  onClose,
  onSaved,
}: {
  open: boolean;
  item: Announcement | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        item
          ? { title_zh: item.title_zh, title_en: item.title_en, body_zh: item.body_zh, body_en: item.body_en }
          : { title_zh: "", title_en: "", body_zh: "", body_en: "" },
      );
    }
  }, [open, item, form]);

  const save = async () => {
    const v = await form.validateFields();
    if (item) await api.updateAnnouncement(item.id, v);
    else await api.createAnnouncement(v);
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      width={720}
      title={item ? t("admin.editAnnouncement") : t("admin.newAnnouncement")}
      onCancel={onClose}
      onOk={save}
      okText={t("admin.save")}
      cancelText={t("admin.cancel")}
    >
      <Form form={form} layout="vertical">
        <Tabs
          items={[
            {
              key: "zh",
              label: "中文",
              children: (
                <>
                  <Form.Item name="title_zh" label={t("admin.title")} rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="body_zh" label={t("admin.content")}>
                    <RichEditor />
                  </Form.Item>
                </>
              ),
            },
            {
              key: "en",
              label: "English",
              children: (
                <>
                  <Form.Item name="title_en" label={t("admin.title")} rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="body_en" label={t("admin.content")}>
                    <RichEditor />
                  </Form.Item>
                </>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  );
}
