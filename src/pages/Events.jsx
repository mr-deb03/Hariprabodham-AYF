import React from "react";
import PageHeader from "../components/PageHeader";
import EventGalleries from "../components/EventGalleries";

export default function EventsPage() {
  return (
    <>
      <PageHeader
        title="Events"
        subtitle="Photos and highlights from our gatherings, festivals and seva activities."
        current="Events"
      />
      <EventGalleries />
    </>
  );
}
