import { DownloadOutlined } from "@ant-design/icons";
import { Button, Empty, Modal, Table } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { api, type FormDef } from "../api";
import { useStore } from "../store";

export default function SubmissionsModal({
  form,
  onClose,
}: {
  form: FormDef | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const token = useStore((s) => s.token);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (form) api.submissions(form.id).then(setRows);
  }, [form]);

  if (!form) return null;

  const columns = [
    { title: "#", dataIndex: "id", width: 60 },
    ...form.fields.map((fld) => ({
      title: fld.label,
      dataIndex: ["data", String(fld.id)],
      render: (_: any, r: any) => {
        const v = r.data?.[String(fld.id)];
        return Array.isArray(v) ? v.join(", ") : v ?? "";
      },
    })),
    {
      title: "时间",
      dataIndex: "created_at",
      render: (v: string) => new Date(v).toLocaleString(),
    },
  ];

  const exportCsv = () => {
    // 带上 token 触发下载
    const url = `/api/forms/${form.id}/export.csv?lang=zh`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `form-${form.id}.csv`;
        a.click();
      });
  };

  return (
    <Modal
      open={!!form}
      width={860}
      title={`${form.title} · ${rows.length} ${t("admin.submissions")}`}
      onCancel={onClose}
      footer={
        <Button icon={<DownloadOutlined />} onClick={exportCsv}>
          {t("admin.exportCsv")}
        </Button>
      }
    >
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <Table
          rowKey="id"
          size="small"
          columns={columns as any}
          dataSource={rows}
          scroll={{ x: true }}
          pagination={{ pageSize: 10 }}
        />
      )}
    </Modal>
  );
}
