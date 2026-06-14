import React from "react";
import PageHeader from "../components/PageHeader";
import ContactSection from "../components/ContactSection";

export default function Contact() {
  return (
    <>
      <PageHeader
        title="Contact Us"
        subtitle="We'd love to hear from you."
        current="Contact"
      />
      <ContactSection />
    </>
  );
}
