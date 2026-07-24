import { BarsOutlined, DeleteOutlined, EditOutlined, FormOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Checkbox, Empty, Input, Popconfirm, Radio, Space, message } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { api, type FormDef } from "../api";
import { useStore } from "../store";
import FormBuilderModal from "./FormBuilderModal";
import SubmissionsModal from "./SubmissionsModal";

function FieldInput({ field, value, onChange }: { field: any; value: any; onChange: (v: any) => void }) {
  switch (field.field_type) {
    case "textarea":
      return <Input.TextArea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />;
    case "radio":
      return (
        <Radio.Group value={value} onChange={(e) => onChange(e.target.value)}>
          <Space direction="vertical">
            {field.options.map((o: any, i: number) => (
              <Radio key={i} value={o.value_zh}>{o.value_zh}</Radio>
            ))}
          </Space>
        </Radio.Group>
      );
    case "checkbox":
      return (
        <Checkbox.Group
          value={value || []}
          onChange={onChange}
          options={field.options.map((o: any) => ({ label: o.value_zh, value: o.value_zh }))}
        />
      );
    default:
      return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}

function SingleForm({ def, onChanged }: { def: FormDef; onChanged: () => void }) {
  const { t } = useTranslation();
  const { isAdmin } = useStore();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    for (const fld of def.fields) {
      if (fld.required && !answers[String(fld.id)]) {
        return message.warning(`${fld.label}: ${t("share.required")}`);
      }
    }
    setSubmitting(true);
    try {
      await api.submitForm(def.id, answers);
      message.success(t("share.submitted"));
      setAnswers({});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{def.title}</div>
      <Space direction="vertical" style={{ width: "100%" }}>
        {def.fields.map((fld) => (
          <div key={fld.id}>
            <div style={{ fontSize: 13, marginBottom: 4 }}>
              {fld.label} {fld.required && <span style={{ color: "red" }}>*</span>}
            </div>
            <FieldInput
              field={fld}
              value={answers[String(fld.id)]}
              onChange={(v) => setAnswers((a) => ({ ...a, [String(fld.id)]: v }))}
            />
          </div>
        ))}
        <Button type="primary" loading={submitting} onClick={submit}>
          {t("share.submit")}
        </Button>
      </Space>
    </div>
  );
}

export default function FormsPanel() {
  const { t } = useTranslation();
  const { isAdmin, lang } = useStore();
  const [forms, setForms] = useState<FormDef[]>([]);
  const [builder, setBuilder] = useState<{ form: FormDef | null } | null>(null);
  const [subs, setSubs] = useState<FormDef | null>(null);

  const load = () => (isAdmin ? api.allForms() : api.activeForms()).then(setForms);
  useEffect(() => {
    load();
  }, [lang, isAdmin]);

  return (
    <Card
      title={
        <Space>
          <FormOutlined />
          {t("share.forms")}
        </Space>
      }
      extra={
        isAdmin && (
          <Button size="small" icon={<PlusOutlined />} onClick={() => setBuilder({ form: null })}>
            {t("admin.newForm")}
          </Button>
        )
      }
      style={{ height: "100%" }}
    >
      {forms.length === 0 ? (
        <Empty description={t("share.noForms")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        forms.map((def) => (
          <div key={def.id} style={{ borderBottom: "1px dashed #eee", paddingBottom: 12, marginBottom: 12 }}>
            {isAdmin && (
              <Space style={{ marginBottom: 8 }}>
                <Button size="small" icon={<EditOutlined />} onClick={() => setBuilder({ form: def })} />
                <Button size="small" icon={<BarsOutlined />} onClick={() => setSubs(def)}>
                  {t("admin.collect")}
                </Button>
                <Popconfirm title={t("admin.confirmDelete")} onConfirm={async () => { await api.deleteForm(def.id); load(); }}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
                {!def.active && <span style={{ color: "#faad14", fontSize: 12 }}>（未启用）</span>}
              </Space>
            )}
            <SingleForm def={def} onChanged={load} />
          </div>
        ))
      )}

      {builder && <FormBuilderModal open form={builder.form} onClose={() => setBuilder(null)} onSaved={load} />}
      <SubmissionsModal form={subs} onClose={() => setSubs(null)} />
    </Card>
  );
}
