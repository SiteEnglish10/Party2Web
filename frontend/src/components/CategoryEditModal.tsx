import { Form, Input, Modal, Select } from "antd";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { api, type Category } from "../api";
import { ICON_OPTIONS } from "../icons";

export default function CategoryEditModal({
  open,
  category,
  onClose,
  onSaved,
}: {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        category
          ? { name_zh: category.name_zh, name_en: category.name_en, icon: category.icon }
          : { name_zh: "", name_en: "", icon: "folder" },
      );
    }
  }, [open, category, form]);

  const save = async () => {
    const values = await form.validateFields();
    if (category) await api.updateCategory(category.id, values);
    else await api.createCategory(values);
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      title={category ? t("admin.editCategory") : t("admin.newCategory")}
      onCancel={onClose}
      onOk={save}
      okText={t("admin.save")}
      cancelText={t("admin.cancel")}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name_zh" label={t("admin.nameZh")} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="name_en" label={t("admin.nameEn")} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="icon" label={t("admin.icon")}>
          <Select options={ICON_OPTIONS.map((v) => ({ value: v, label: v }))} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
