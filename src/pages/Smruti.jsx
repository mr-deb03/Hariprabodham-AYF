import React from "react";
import PageHeader from "../components/PageHeader";
import SmrutiForm from "../components/SmrutiForm";

export default function Smruti() {
  return (
    <>
      <PageHeader
        title="Smruti"
        subtitle="Relive your memories — find and receive your photos from our gatherings, straight on WhatsApp."
        current="Smruti"
      />
      <SmrutiForm />
    </>
  );
}
