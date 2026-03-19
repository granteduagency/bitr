declare module "parse-full-name" {
  export type ParsedFullName = {
    title: string;
    first: string;
    middle: string;
    last: string;
    nick: string;
    suffix: string;
    error: string[];
  };

  export function parseFullName(
    nameToParse: string,
    partToReturn?: "all" | "title" | "first" | "middle" | "last" | "nick" | "suffix" | "error",
    fixCase?: -1 | 0 | 1 | boolean,
    stopOnError?: 0 | 1 | boolean,
    useLongLists?: 0 | 1 | boolean,
  ): ParsedFullName;
}
