import { LaunchProps, List, getPreferenceValues } from "@raycast/api";
import { useState, useMemo } from "react";

import { IssueListEmptyView } from "./components/IssueListEmptyView";
import IssueListItem from "./components/IssueListItem";
import { withJiraCredentials } from "./helpers/withJiraCredentials";
import useIssues from "./hooks/useIssues";

type SearchIssuesProps = {
  query?: string;
};

export function SearchIssues({ query: initialQuery }: SearchIssuesProps) {
  const [query, setQuery] = useState(() => {
    return initialQuery ?? "";
  });
  console.log(getPreferenceValues())
  let prefix = getPreferenceValues()["search-issues-prefix"]
  //Normalize project key to without dash
  if (prefix.at(-1) === "-") {
    prefix= prefix.slice(0, -1)
  }
  const jql = useMemo(() => {
    if (query === "") {
      return "ORDER BY created DESC";
    }

    if (query.startsWith("jql:")) {
      return query.split("jql:")[1];
    }

    let issueKeyQuery = "";
    const issueKeyRegex = /\w+-\d+/;
    const onlyNumbers = /^\d+$/
    const matches = query.match(issueKeyRegex);
    const escapedQuery = query.replace(/[\\"]/g, "\\$&");

    if (matches) {
      issueKeyQuery = `OR issuekey = ${matches[0]}`;
    } else if(prefix &&  query.match(onlyNumbers)) {
      issueKeyQuery = `OR issuekey = ${prefix}-${escapedQuery}`;
    }
    
    // "text" by default searches in fields summary, description, environment, comments and all text custom fields.
    // Search "project" so that an issuekey prefix will be found (e.g. "APP").
    return `(text ~ "${escapedQuery}" OR project = "${escapedQuery}" ${issueKeyQuery}) ORDER BY updated DESC`;
  }, [query]);

  const { issues, isLoading, mutate } = useIssues(jql, { keepPreviousData: true });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Globally search issues across projects"
      onSearchTextChange={setQuery}
      searchText={query}
      throttle
    >
      <List.Section
        title={query.length > 0 ? "Search Results" : "Created Recently"}
        subtitle={issues && issues.length > 1 ? `${issues.length} issues` : "1 issue"}
      >
        {issues?.map((issue) => {
          return <IssueListItem key={issue.id} issue={issue} mutate={mutate} />;
        })}
      </List.Section>

      <IssueListEmptyView />
    </List>
  );
}
export default function Command(props: LaunchProps) {
  return withJiraCredentials(<SearchIssues query={props.launchContext?.query} />);
}
