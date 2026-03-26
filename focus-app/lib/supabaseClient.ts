import { createClient } from "@supabase/supabase-js";

// Supabaseのクレデンシャルはクライアントで使うため NEXT_PUBLIC が必須です。
//
// ただしビルド時（prerender）に未設定だと createClient が例外を投げるため、
// ここでは「ビルドは通す」ためのダミー値フォールバックにしています。
// 実運用では .env.local に正しい値を設定してください。
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const safeUrl = supabaseUrl || "https://localhost";
const safeAnonKey = supabaseAnonKey || "public-anon-key";

export const supabase = createClient(safeUrl, safeAnonKey);

