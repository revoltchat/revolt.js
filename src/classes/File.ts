import { Metadata } from "revolt-api";

import { API, Client } from "..";

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
    file: Pick<API.File, "_id" | "tag" | "metadata"> & Partial<API.File>
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
  get url() {
    return `${this.#client.configuration?.features.autumn.url}/${this.tag}/${
      this.id
    }/${this.filename}`;
  }

  /**
   * Download URL for the file
   */
  get downloadURL() {
    return `${this.#client.configuration?.features.autumn.url}/${
      this.tag
    }/download/${this.id}/${this.filename}`;
  }

  /**
   * Human readable file size
   */
  get humanReadableSize() {
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
  get isSpoiler() {
    return this.filename?.toLowerCase().startsWith("spoiler_") ?? false;
  }

  /**
   * Creates a URL to a given file with given options.
   * @param options Optional query parameters to modify object
   * @param allowAnimation Returns GIF if applicable, no operations occur on image
   * @returns Generated URL or nothing
   */
  createFileURL(
    options?: {
      max_side?: number;
      size?: number;
      width?: number;
      height?: number;
    },
    allowAnimation?: boolean
  ) {
    const autumn = this.#client.configuration?.features.autumn;
    if (!autumn?.enabled) return;

    // TODO: server-side
    if (this.metadata?.type === "Image") {
      if (
        Math.min(this.metadata.width, this.metadata.height) <= 0 ||
        (this.contentType === "image/gif" &&
          Math.max(this.metadata.width, this.metadata.height) >= 4096)
      )
        return;
    }

    let query = "";
    if (options) {
      if (!allowAnimation || this.contentType !== "image/gif") {
        query =
          "?" +
          Object.keys(options)
            .map((k) => `${k}=${options[k as keyof typeof options]}`)
            .join("&");
      }
    }

    return `${autumn.url}/${this.tag}/${this.id}${query}`;
  }
}
