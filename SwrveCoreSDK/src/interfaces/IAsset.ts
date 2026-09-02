export interface IAsset {
  id: string | number;
  path: string;
  /** True for video assets. A platform may need to cache a video by a
      different mechanism than an image, and cannot tell them apart from the
      path alone, so the distinction is carried here. */
  isVideo?: boolean;
}
