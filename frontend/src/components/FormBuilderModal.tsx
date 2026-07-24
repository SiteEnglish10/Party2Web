import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Select, Space, Switch } from "antd";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { api, type FormDef } from "../api";

export default function FormBuilderModal({
  open,
  form: def,
  onClose,
  onSaved,
}: {
  open: boolean;
  form: FormDef | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [f] = Form.useForm();

  useEffect(() => {
    if (open) {
      f.setFieldsValue(
        def
          ? {
              title_zh: def.title_zh,
              title_en: def.title_en,
              active: def.active,
              fields: def.fields.map((fld) => ({
                label_zh: fld.label_zh,
                label_en: fld.label_en,
                field_type: fld.field_type,
                required: fld.required,
                options: (fld.options || []).map((o) => o.value_zh).join("\n"),
              })),
            }
          : { title_zh: "", title_en: "", active: true, fields: [] },
      );
    }
  }, [open, def, f]);

  const save = async () => {
    const v = await f.validateFields();
    const payload = {
      title_zh: v.title_zh,
      title_en: v.title_en,
      active: v.active,
      fields: (v.fields || []).map((fld: any) => ({
        label_zh: fld.label_zh,
        label_en: fld.label_en || fld.label_zh,
        field_type: fld.field_type,
        required: !!fld.required,
        options: (fld.options || "")
          .split("\n")
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map((s: string) => ({ value_zh: s, value_en: s })),
      })),
    };
    if (def) await api.updateForm(def.id, payload);
    else await api.createForm(payload);
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      width={720}
      title={t("admin.formBuilder")}
      onCancel={onClose}
      onOk={save}
      okText={t("admin.save")}
      cancelText={t("admin.cancel")}
    >
      <Form form={f} layout="vertical">
        <Space style={{ width: "100%" }} align="baseline">
          <Form.Item name="title_zh" label={t("admin.title") + " (中)"} rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="title_en" label={t("admin.title") + " (EN)"} rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="active" label={t("admin.active")} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>

        <Form.List name="fields">
          {(fields, { add, remove }) => (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {fields.map((field) => (
                <div key={field.key} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
                  <Space style={{ width: "100%" }} align="baseline" wrap>
                    <Form.Item {...field} name={[field.name, "label_zh"]} label={t("admin.fieldLabel") + " (中)"} rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, "label_en"]} label={t("admin.fieldLabel") + " (EN)"}>
                      <Input />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, "field_type"]} label={t("admin.fieldType")} initialValue="text">
                      <Select
                        style={{ width: 130 }}
                        options={[
                          { value: "text", label: t("admin.text") },
                          { value: "textarea", label: t("admin.textarea") },
                          { value: "radio", label: t("admin.radio") },
                          { value: "checkbox", label: t("admin.checkbox") },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, "required"]} label={t("share.required")} valuePropName="checked">
                      <Switch size="small" />
                    </Form.Item>
                    <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                  </Space>
                  <Form.Item {...field} name={[field.name, "options"]} label={t("admin.options")} style={{ marginBottom: 0 }}>
                    <Input.TextArea rows={2} placeholder={"选项A\n选项B"} />
                  </Form.Item>
                </div>
              ))}
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ field_type: "text" })}>
                {t("admin.addField")}
              </Button>
            </div>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
