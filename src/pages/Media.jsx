import React from "react";
import PageHeader from "../components/PageHeader";
import MediaGallery from "../components/MediaGallery";

export default function Media() {
  return (
    <>
      <PageHeader
        title="Media"
        subtitle="Watch our gatherings and reels from our YouTube channel and Instagram."
        current="Media"
      />
      <MediaGallery />
    </>
  );
}
