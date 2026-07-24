import { Col, Row } from "antd";

import AnnouncementsPanel from "../components/AnnouncementsPanel";
import CommentsSection from "../components/CommentsSection";
import FormsPanel from "../components/FormsPanel";

export default function SharePage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <AnnouncementsPanel />
        </Col>
        <Col xs={24} md={12}>
          <FormsPanel />
        </Col>
      </Row>
      <CommentsSection />
    </div>
  );
}
