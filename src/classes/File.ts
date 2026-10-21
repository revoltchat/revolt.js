import { createSignal } from "solid-js";

import type { File as APIFile, Metadata } from "stoat-api";

import type { Client } from "../Client.js";
import { decrypt } from "../lib/e2ee.js";

/**
 * Uploaded File
 */
export class File {
  #client: Client;

  /**
   * File Id
   */
  readonly id: string;

  /**
   * File bucket
   */
  readonly tag: string;

  /**
   * Original filename
   */
  readonly filename?: string;

  /**
   * Parsed metadata of the file
   */
  readonly metadata: Metadata;

  /**
   * Raw content type of this file
   */
  readonly contentType?: string;

  /**
   * Size of the file (in bytes)
   */
  readonly size?: number;

  /** Key's channel id, if encrypted */
  readonly e2e_id: string;

  #url;
  #setUrl;

  /**
   * Construct File
   * @param client Client
   * @param file File
   */
  constructor(
    client: Client,
    file: (Pick<APIFile, "_id" | "tag" | "metadata"> & Partial<APIFile>) | File,
  ) {
    this.#client = client;

    if ("id" in file) {
      this.id = file.id;
      this.contentType = file.contentType;
    } else {
      this.id = file._id;
      this.contentType = file.content_type;
    }

    this.tag = file.tag;
    this.filename = file.filename;
    this.metadata = file.metadata;
    this.size = file.size;
    this.e2e_id = file.e2e_id!;

    if (this.e2e_id && !("id" in file)) {
      const [url, setUrl] = createSignal<string>();
      this.#url = url;
      this.#setUrl = setUrl;

      if (this.filename) {
        const extIdx = this.filename.indexOf("."),
          ext = extIdx === -1 ? "" : this.filename.slice(extIdx),
          mime = this.filename.slice(0, -ext.length);

        //Detect meta type from mime
        (this.contentType as string) = mime;
        if (mime.startsWith("image/")) this.metadata.type = "Image";
        else if (mime.startsWith("video/")) this.metadata.type = "Video";
        else if (mime.startsWith("audio/")) this.metadata.type = "Audio";
        else if (mime.startsWith("text/")) this.metadata.type = "Text";
        this.filename = this.metadata.type.toLowerCase() + ext;
      }
    }
  }

  /** Load encrypted file URL, if any. Call `unloadFile()` when finished */
  async loadFile() {
    if (!this.e2e_id) return;
    const key = this.#client.channels.get(this.e2e_id)?.key;
    if (key)
      try {
        const req = await fetch(this._rawUrl);
        if (req.status !== 200) throw `HTTP Code ${req.status}`;
        const buf = await decrypt(key, await req.arrayBuffer());
        this.#setUrl!(
          URL.createObjectURL(new Blob([buf], { type: this.contentType })),
        );
      } catch (e) {
        console.error(`Decrypt File ${this.filename}`, e);
      }
  }

  /** Unload file from memory */
  unloadFile() {
    if (!this.#url) return;
    URL.revokeObjectURL(this.#url!()!);
    this.#setUrl!();
  }

  get _rawUrl() {
    return `${this.#client.configuration?.features.autumn.url}/${
      this.tag
    }/${this.id}/original`;
  }

  /**
   * Preview URL for the file
   */
  get previewUrl(): string {
    if (this.e2e_id) return this.#url!() ?? "";
    return `${this.#client.configuration?.features.autumn.url}/${
      this.tag
    }/${this.id}`;
  }

  /**
   * Original download URL for the file
   */
  get originalUrl(): string {
    return this.e2e_id ? (this.#url!() ?? "") : this._rawUrl;
  }

  /**
   * Human readable file size
   */
  get humanReadableSize(): string {
    if (!this.size) return "Unknown size";

    if (this.size > 1e6) {
      return `${(this.size / 1e6).toFixed(2)} MB`;
    } else if (this.size > 1e3) {
      return `${(this.size / 1e3).toFixed(2)} KB`;
    }

    return `${this.size} B`;
  }

  /**
   * Whether this file should have a spoiler
   */
  get isSpoiler(): boolean {
    return this.filename?.toLowerCase().startsWith("spoiler_") ?? false;
  }

  /**
   * Creates a URL to a given file with given options.
   * @param forceAnimation Returns GIF if applicable (for avatars/icons)
   * @returns Generated URL or nothing
   */
  createFileURL(forceAnimation?: boolean): string | undefined {
    if (this.e2e_id) return this.#url!() ?? "";

    const autumn = this.#client.configuration?.features.autumn;
    if (!autumn?.enabled) return;

    let query = "";
    if (
      forceAnimation &&
      (this.contentType === "image/gif" || this.contentType === "image/webp")
    ) {
      query = "/original";
    }

    return `${autumn.url}/${this.tag}/${this.id}${query}`;
  }
}
