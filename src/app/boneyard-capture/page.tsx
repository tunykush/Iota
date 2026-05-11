import { notFound } from "next/navigation";
import { BoneyardCaptureClient } from "./BoneyardCaptureClient";

export default function BoneyardCapturePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <BoneyardCaptureClient />;
}
