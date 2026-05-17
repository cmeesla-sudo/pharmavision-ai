import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const reqStartTime = Date.now();
  console.log(`[EDGE] [START] Request received at ISO: ${new Date().toISOString()}`);

  // Handle OPTIONS preflight requests
  if (req.method === "OPTIONS") {
    console.log("[EDGE] OPTIONS preflight handled");
    return new Response("ok", { headers: corsHeaders });
  }

  let body;
  try {
    body = await req.json();
  } catch (err: any) {
    console.error("[EDGE] [ERROR] Failed to parse request JSON body:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Invalid JSON payload in request",
      failure_point: "req_json_parse",
      details: err.message
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const rawImage = body.image || body.base64Image || body.base64;
  if (!rawImage) {
    console.warn("[EDGE] [WARN] Missing base64 image data in payload");
    return new Response(JSON.stringify({
      success: false,
      error: "Missing base64 image data in payload",
      failure_point: "missing_image"
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const b64Length = rawImage.length;
  const approxKB = Math.round((b64Length * 0.75) / 1024);
  console.log(`[EDGE] [STATS] Base64 length: ${b64Length} chars | Approx image size: ${approxKB} KB`);

  const apiKey = Deno.env.get("NVIDIA_API_KEY") || Deno.env.get("VITE_NVIDIA_API_KEY");
  if (!apiKey) {
    console.error("[EDGE] [CRITICAL] Missing NVIDIA_API_KEY environment variable");
    return new Response(JSON.stringify({
      success: false,
      error: "Server configuration error: Missing NVIDIA_API_KEY",
      failure_point: "env_config"
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const cleanImage = rawImage.replace(/^data:image\/\w+;base64,/, "").replace(/\s+/g, "");
  const fullDataUrl = `data:image/jpeg;base64,${cleanImage}`;

  const promptText = `Extract pharmaceutical packaging details into strictly raw JSON matching exactly:
{"medicine_name":"Brand/drug name","manufacturer":"Company","dosage":"e.g. 500mg","expiry_date":"YYYY-MM-DD","batch_number":"Batch code","tablet_count":"Total units","medicine_type":"Tablet/Capsule/Syrup","confidence_score":90}
Do not include markdown or formatting. Keep response brief and strictly JSON.`;

  const payload = {
    model: "meta/llama-3.2-90b-vision-instruct",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: promptText },
          { type: "image_url", image_url: { url: fullDataUrl } }
        ]
      }
    ],
    temperature: 0.1,
    max_tokens: 300,
    stream: false
  };

  const apiStartTime = Date.now();
  console.log(`[EDGE] [API_START] Invoking external NVIDIA API core at +${apiStartTime - reqStartTime}ms...`);

  const controller = new AbortController();
  // 18-second timeout so Edge function gracefully handles it before Cloudflare/Supabase 25s threshold
  const timeoutId = setTimeout(() => controller.abort(), 18000);

  let response;
  try {
    response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (fetchErr: any) {
    clearTimeout(timeoutId);
    const duration = Date.now() - apiStartTime;
    console.error(`[EDGE] [API_FAILURE] Fetch exception after ${duration}ms:`, fetchErr);
    
    const isTimeout = fetchErr.name === "AbortError" || fetchErr.message?.toLowerCase().includes("abort") || fetchErr.message?.toLowerCase().includes("timeout");
    return new Response(JSON.stringify({
      success: false,
      error: isTimeout ? "NVIDIA AI Gateway Timeout: Analysis exceeded 18s" : `NVIDIA Network Connection Failed: ${fetchErr.message}`,
      failure_point: isTimeout ? "nvidia_api_timeout" : "nvidia_api_network",
      duration_ms: duration,
      details: fetchErr.stack || fetchErr.message
    }), { status: isTimeout ? 504 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } finally {
    clearTimeout(timeoutId);
  }

  const apiDuration = Date.now() - apiStartTime;
  console.log(`[EDGE] [API_RESPONSE] Received HTTP ${response.status} from NVIDIA after ${apiDuration}ms`);

  let responseText = "";
  try {
    responseText = await response.text();
  } catch (textErr: any) {
    console.error("[EDGE] [ERROR] Failed to read raw response body:", textErr);
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to read raw response stream from NVIDIA",
      failure_point: "read_res_text",
      details: textErr.message
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (!response.ok) {
    console.error(`[EDGE] [API_NON_2XX] API returned status ${response.status}. Raw body: ${responseText}`);
    return new Response(JSON.stringify({
      success: false,
      error: `NVIDIA API Error (${response.status})`,
      failure_point: "nvidia_api_error_response",
      http_status: response.status,
      details: responseText
    }), { status: response.status === 401 || response.status === 403 ? response.status : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseErr: any) {
    console.error("[EDGE] [ERROR] JSON.parse failed on NVIDIA response:", responseText, parseErr);
    return new Response(JSON.stringify({
      success: false,
      error: "Malformed JSON structure in NVIDIA API payload",
      failure_point: "parse_res_json",
      details: responseText
    }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const rawOutput = data.choices?.[0]?.message?.content || "{}";
  console.log(`[EDGE] [RAW_OUTPUT] Length: ${rawOutput.length} chars. Output preview: ${rawOutput.substring(0, 150)}...`);

  const cleanedContent = rawOutput.replace(/```json/g, "").replace(/```/g, "").replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();

  let parsedJson;
  try {
    parsedJson = JSON.parse(cleanedContent);
    console.log("[EDGE] [PARSE] Successfully parsed LLM JSON output standard way");
  } catch (jsonErr: any) {
    console.warn("[EDGE] [WARN] Standard JSON parse failed, attempting robust regex fallback extraction. Raw:", cleanedContent);
    parsedJson = {
      medicine_name: cleanedContent.match(/"medicine_name":\s*"([^"]*)"/)?.[1] || "Unknown Medicine",
      manufacturer: cleanedContent.match(/"manufacturer":\s*"([^"]*)"/)?.[1] || "Generic Manufacturer",
      dosage: cleanedContent.match(/"dosage":\s*"([^"]*)"/)?.[1] || "Standard Dosage",
      expiry_date: cleanedContent.match(/"expiry_date":\s*"([^"]*)"/)?.[1] || "N/A",
      batch_number: cleanedContent.match(/"batch_number":\s*"([^"]*)"/)?.[1] || "BATCH-UNREC",
      tablet_count: cleanedContent.match(/"tablet_count":\s*["']?(\d+)/)?.[1] || "10",
      medicine_type: cleanedContent.match(/"medicine_type":\s*"([^"]*)"/)?.[1] || "Tablet",
      confidence_score: Number(cleanedContent.match(/"confidence_score":\s*(\d+)/)?.[1] || 85)
    };
  }

  const finalResult = {
    medicine_name: parsedJson.medicine_name || "Unknown Medicine",
    manufacturer: parsedJson.manufacturer || "Generic Manufacturer",
    dosage: parsedJson.dosage || "Standard Dosage",
    expiry_date: parsedJson.expiry_date || "N/A",
    batch_number: parsedJson.batch_number || "BATCH-UNREC",
    tablet_count: String(parsedJson.tablet_count || "10"),
    medicine_type: parsedJson.medicine_type || "Tablet",
    confidence_score: Number(parsedJson.confidence_score) || 85
  };

  const totalDuration = Date.now() - reqStartTime;
  console.log(`[EDGE] [COMPLETE] Request completed successfully in ${totalDuration}ms. Result:`, JSON.stringify(finalResult));

  return new Response(JSON.stringify({
    success: true,
    data: finalResult,
    raw: rawOutput,
    execution_time_ms: totalDuration
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
