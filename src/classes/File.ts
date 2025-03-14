import type { File as APIFile, Metadata } from "revolt-api";

import type { Client } from "../Client.js";

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

  /**
   * Construct File
   * @param client Client
   * @param file File
   */
  constructor(
    client: Client,
    file: Pick<APIFile, "_id" | "tag" | "metadata"> & Partial<APIFile>,
  ) {
    this.#client = client;
    this.id = file._id;
    this.tag = file.tag;
    this.filename = file.filename;
    this.metadata = file.metadata;
    this.contentType = file.content_type;
    this.size = file.size;
  }

  /**
   * Direct URL to the file
   */
  get url(): string {
    return `${this.#client.configuration?.features.autumn.url}/${this.tag}/${this.id}/${this.filename}`;
  }

  /**
   * Download URL for the file
   */
  get downloadURL(): string {
    return `${this.#client.configuration?.features.autumn.url}/${this.tag}/download/${this.id}/${this.filename}`;
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
    const autumn = this.#client.configuration?.features.autumn;
    if (!autumn?.enabled) return;

    let query = "";
    if (forceAnimation && this.contentType === "image/gif") {
      query = "/original";
    }

    return `${autumn.url}/${this.tag}/${this.id}${query}`;
  }
}
