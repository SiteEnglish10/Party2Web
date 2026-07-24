import { Form, Input, Modal, Select } from "antd";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { api, type Tool } from "../api";
import { ICON_OPTIONS } from "../icons";
import { RUNNERS } from "../tools/runners";

export default function ToolEditModal({
  open,
  tool,
  categoryId,
  onClose,
  onSaved,
}: {
  open: boolean;
  tool: Tool | null;
  categoryId?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        tool || {
          key: "",
          name_zh: "",
          name_en: "",
          desc_zh: "",
          desc_en: "",
          icon: "tool",
          runtime: "front",
          tool_type: "",
        },
      );
    }
  }, [open, tool, form]);

  const save = async () => {
    const values = await form.validateFields();
    const payload = { ...values, config: "{}" };
    if (tool) await api.updateTool(tool.id, payload);
    else await api.createTool({ ...payload, category_id: categoryId });
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      title={tool ? t("admin.editTool") : t("admin.newTool")}
      onCancel={onClose}
      onOk={save}
      okText={t("admin.save")}
      cancelText={t("admin.cancel")}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="key" label="key" rules={[{ required: true }]}>
          <Input placeholder="unique-key" />
        </Form.Item>
        <Form.Item name="name_zh" label={t("admin.nameZh")} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="name_en" label={t("admin.nameEn")} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="desc_zh" label={t("admin.descZh")}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="desc_en" label={t("admin.descEn")}>
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="icon" label={t("admin.icon")}>
          <Select options={ICON_OPTIONS.map((v) => ({ value: v, label: v }))} />
        </Form.Item>
        <Form.Item name="runtime" label={t("admin.runtime")}>
          <Select
            options={[
              { value: "front", label: t("admin.front") },
              { value: "backend", label: t("admin.backend") },
            ]}
          />
        </Form.Item>
        <Form.Item name="tool_type" label={t("admin.toolType")} rules={[{ required: true }]}>
          <Select
            showSearch
            options={Object.keys(RUNNERS).map((v) => ({ value: v, label: v }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
