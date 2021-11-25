import { SongCollection } from "./song-collection.ts";
import { Song } from "./song.ts";
import { Source } from "./sources/sources.ts";

/**
 * A representation of a playable object in the form of a song or a collection
 * of songs, which contains key information about the listing.
 */
interface SongListing {
  /** The source of the song listing. */
  source: Source;
  /** The ID of the user who requested the song listing. */
  requestedBy: string;
  /**
   * An array of users who have been present at the time of the request of the
   * song listing, and thus can manage it (i.e. skip it, remove it, etc.)
   */
  managedBy: string[];
  /** The song which the song listing is for. */
  song?: Song;
  /** The collection of songs which the song listing is for. */
  collection?: SongCollection;
}

export type { SongListing };
