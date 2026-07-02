export type FetchedUrl = {
  url: string;
  buffer: Buffer;
  contentType?: string;
};

export async function fetchUrl(url: string): Promise<FetchedUrl> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status} ${response.statusText})`);
  }

  return {
    url,
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? undefined,
  };
}
