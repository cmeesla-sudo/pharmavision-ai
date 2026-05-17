/**
 * Secure NVIDIA Kimi K2.6 Vision AI Service for PharmaVision AI
 * Calls Supabase Edge Function (/functions/v1/nvidia-vision) with robust error parsing.
 */
import { supabase } from '../lib/supabase';

export async function analyzeMedicineImage(base64Image) {
  if (!base64Image) {
    throw new Error("Invalid image: base64 matrix is missing or corrupted.");
  }

  try {
    const { data, error } = await supabase.functions.invoke('nvidia-vision', {
      body: { image: base64Image }
    });

    if (error) {
      console.error("[NVIDIA_AI] Supabase Edge invocation error:", error);
      throw new Error(`AI Gateway Error: ${error.message || 'Failed to connect to NVIDIA Vision Edge Function (504/502 Gateway Timeout)'}`);
    }

    if (data && data.success === false) {
      console.error("[NVIDIA_AI] Edge Function returned explicit error:", data);
      throw new Error(data.error || "Unable to analyze image. Please try again.");
    }

    if (data?.error) {
      console.error("[NVIDIA_AI] API or Parsing Error:", data.error);
      throw new Error(data.error);
    }

    if (!data || !data.data) {
      throw new Error("Unable to analyze image. Please try again.");
    }

    return {
      raw: data.raw || JSON.stringify(data.data),
      data: data.data,
      execution_time_ms: data.execution_time_ms
    };
  } catch (err) {
    console.error("[NVIDIA_AI] Secure Edge Function Invocation Exception:", err);
    throw new Error(err.message || "Unable to analyze image. Please try again.");
  }
}
