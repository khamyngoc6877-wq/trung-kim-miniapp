import CONFIG from "@/config";
import type { UserInfo } from "@/types";

const API = String(
  import.meta.env.VITE_API_URL ?? "",
).replace(/\/$/, "");

async function request(
  path: string,
  init?: RequestInit,
) {
  if (!API) {
    throw new Error(
      "Chưa cấu hình VITE_API_URL",
    );
  }

  const response = await fetch(
    `${API}${path}`,
    {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    },
  );

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ??
        `Yêu cầu thất bại (${response.status})`,
    );
  }

  return data;
}

function save(member: UserInfo) {
  localStorage.setItem(
    CONFIG.STORAGE_KEYS.USER_INFO,
    JSON.stringify(member),
  );
  return member;
}

export async function registerMember(input: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  password: string;
}) {
  return save(
    await request(
      "/api/members/register",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  );
}

export async function loginMember(
  phone: string,
  password: string,
) {
  return save(
    await request("/api/members/login", {
      method: "POST",
      body: JSON.stringify({
        phone,
        password,
      }),
    }),
  );
}

export async function refreshMember() {
  const raw = localStorage.getItem(
    CONFIG.STORAGE_KEYS.USER_INFO,
  );

  if (!raw) return null;

  const old = JSON.parse(raw);
  if (!old?.id) return null;

  return save(
    await request(
      `/api/members/${encodeURIComponent(
        old.id,
      )}`,
    ),
  );
}

export async function redeemPoints(
  memberId: string,
) {
  const data = await request(
    `/api/members/${encodeURIComponent(
      memberId,
    )}/redeem`,
    {
      method: "POST",
    },
  );

  save(data);
  return data;
}
