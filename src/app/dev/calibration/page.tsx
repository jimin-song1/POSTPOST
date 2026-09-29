import { notFound } from "next/navigation";
import { isLocalCalibrationEnabled } from "@/lib/saju/calibration/local-mode";
import { CalibrationClient } from "@/components/calibration/CalibrationClient";
export const dynamic="force-dynamic";
export default function CalibrationPage(){if(!isLocalCalibrationEnabled())notFound();return <CalibrationClient/>;}
