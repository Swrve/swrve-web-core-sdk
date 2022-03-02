import { IDictionary } from "..";

export function combineDictionaries(
  rootDictionary: IDictionary<string>,
  overiddingDictionary: IDictionary<string>
): IDictionary<string> {
  let combinedDictionary: IDictionary<string> = {};
  if (rootDictionary && Object.keys(rootDictionary).length > 0) {
    let overiddingKeys = Object.keys(overiddingDictionary);
    combinedDictionary = rootDictionary;

    for (let key of overiddingKeys) {
      combinedDictionary[key] = overiddingDictionary[key];
    }
  } else {
    combinedDictionary = overiddingDictionary;
  }

  return combinedDictionary;
}