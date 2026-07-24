import { CommentOutlined, DeleteOutlined, LikeOutlined } from "@ant-design/icons";
import { Avatar, Button, Card, Empty, Input, List, Popconfirm, Space, Tag, message } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { api, type Comment } from "../api";
import { anonToken, useStore } from "../store";
import RichEditor from "./RichEditor";

export default function CommentsSection() {
  const { t } = useTranslation();
  const { isAdmin } = useStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState(localStorage.getItem("author_name") || "");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = () => api.comments().then(setComments);
  useEffect(() => {
    load();
  }, []);

  const post = async () => {
    if (!body.replace(/<[^>]*>/g, "").trim() && !body.includes("<img")) {
      return message.warning(t("share.writeComment"));
    }
    setPosting(true);
    try {
      localStorage.setItem("author_name", name);
      await api.createComment({
        author_token: anonToken(),
        author_name: name || "匿名",
        body,
      });
      setBody("");
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.detail || t("common.error"));
    } finally {
      setPosting(false);
    }
  };

  const like = async (id: number) => {
    const res = await api.likeComment(id);
    setComments((cs) => cs.map((c) => (c.id === id ? { ...c, likes: res.likes } : c)));
  };

  return (
    <Card
      title={
        <Space>
          <CommentOutlined />
          {t("share.comments")}
          <Tag>{t("share.sortedByLikes")}</Tag>
        </Space>
      }
      extra={<span style={{ fontSize: 12, color: "#999" }}>{t("share.commentsHint")}</span>}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Input
          placeholder={t("share.yourName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          style={{ maxWidth: 260 }}
        />
        <RichEditor value={body} onChange={setBody} placeholder={t("share.writeComment")} />
        <Button type="primary" loading={posting} onClick={post} style={{ alignSelf: "flex-end" }}>
          {t("share.publish")}
        </Button>
      </Space>

      <div style={{ marginTop: 20 }}>
        {comments.length === 0 ? (
          <Empty description={t("share.noComments")} />
        ) : (
          <List
            dataSource={comments}
            renderItem={(c) => (
              <List.Item
                actions={[
                  <Button key="like" type="text" icon={<LikeOutlined />} onClick={() => like(c.id)}>
                    {c.likes}
                  </Button>,
                  ...(isAdmin
                    ? [
                        <Popconfirm key="del" title={t("admin.confirmDelete")} onConfirm={async () => { await api.deleteComment(c.id); load(); }}>
                          <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>,
                      ]
                    : []),
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar>{c.author_name.slice(0, 1)}</Avatar>}
                  title={
                    <span>
                      {c.author_name}{" "}
                      <span style={{ fontWeight: 400, fontSize: 12, color: "#999" }}>
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </span>
                  }
                  description={<div className="comment-body" dangerouslySetInnerHTML={{ __html: c.body }} />}
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </Card>
  );
}
