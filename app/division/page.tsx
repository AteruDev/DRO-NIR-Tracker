"use client";

import RequireRole from "../../components/RequireRole";
import Header from "../../components/Header";
import DocumentsView from "../../components/DocumentsView";

export default function DivisionPage() {
  return (
    <RequireRole role="division">
      {(profile) => (
        <>
          <Header profile={profile} />
          <DocumentsView profile={profile} />
        </>
      )}
    </RequireRole>
  );
}
