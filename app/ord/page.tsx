"use client";

import RequireRole from "../../components/RequireRole";
import Header from "../../components/Header";
import DocumentsView from "../../components/DocumentsView";

export default function OrdPage() {
  return (
    <RequireRole role="ord">
      {(profile) => (
        <>
          <Header profile={profile} />
          <DocumentsView profile={profile} />
        </>
      )}
    </RequireRole>
  );
}
