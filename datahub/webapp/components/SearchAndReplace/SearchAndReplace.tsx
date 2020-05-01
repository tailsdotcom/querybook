import React, {
    useState,
    useEffect,
    useCallback,
    useReducer,
    useRef,
    useImperativeHandle,
} from 'react';
import {
    ISearchOptions,
    ISearchResult,
    ISearchAndReplaceState,
} from 'const/searchAndReplace';
import {
    ISearchAndReplaceContextType,
    SearchAndReplaceContext,
} from 'context/searchAndReplace';
import {
    ISearchAndReplaceBarProps,
    SearchAndReplaceBar,
} from 'components/SearchAndReplace/SearchAndReplaceBar';
import { WithOptional } from 'lib/typescript';
import { ISearchAndReplaceBarHandles } from './SearchAndReplaceBar';
import { matchKeyPress } from 'lib/utils/keyboard';
import { useWindowEvent } from 'hooks/useWindowEvent';

const initialSearchState: ISearchAndReplaceState = {
    searchString: '',
    replaceString: '',
    searchResults: [],
    currentSearchResultIndex: 0,
    searchOptions: {
        matchCase: false,
        useRegex: false,
    },
};

export interface ISearchAndReplaceProps {
    getSearchResults: (
        searchString: string,
        searchOptions: ISearchOptions
    ) => ISearchResult[];
    replace: (
        searchResultsToReplace: ISearchResult[],
        replaceString: string
    ) => void;
    jumpToResult?: (searchResult: ISearchResult) => Promise<any>;
}

export function useSearchAndReplace({
    getSearchResults,
    replace,
    jumpToResult,
    focusSearchBar,
}: ISearchAndReplaceProps & {
    focusSearchBar: () => any;
}): {
    searchAndReplaceContext: ISearchAndReplaceContextType;
    searchAndReplaceProps: WithOptional<ISearchAndReplaceBarProps, 'onHide'>;
    reset: () => void;
    performSearch: (isActiveSearch?: boolean) => void;
} {
    const [searchState, setSearchState] = useState(initialSearchState);

    const reset = useCallback(() => setSearchState(initialSearchState), []);
    const performSearch = useCallback(
        // Active search happens when user is using the search input
        // Passive search is when the search content is changed
        (isActiveSearch: boolean = false) => {
            setSearchState((oldSearchState) => {
                const searchResults = getSearchResults(
                    oldSearchState.searchString,
                    oldSearchState.searchOptions
                );
                if (isActiveSearch) {
                    jumpToResult(
                        searchResults[oldSearchState.currentSearchResultIndex]
                    ).then(focusSearchBar);
                }
                return {
                    ...oldSearchState,
                    searchResults,
                };
            });
        },
        [getSearchResults, jumpToResult, focusSearchBar]
    );
    const onSearchStringChange = useCallback((searchString: string) => {
        setSearchState((oldSearchState) => ({
            ...oldSearchState,
            searchString,
            currentSearchResultIndex: 0,
        }));
    }, []);
    const onSearchOptionsChange = useCallback(
        (searchOptions: ISearchOptions) => {
            setSearchState((oldSearchState) => ({
                ...oldSearchState,
                searchOptions,
                currentSearchResultIndex: 0,
            }));
        },
        []
    );
    const onReplaceStringChange = useCallback((replaceString: string) => {
        setSearchState((oldSearchState) => ({
            ...oldSearchState,
            replaceString,
        }));
    }, []);

    const moveResultIndex = useCallback((delta: number) => {
        return new Promise((resolve) => {
            setSearchState((oldSearchState) => {
                const resultLen = oldSearchState.searchResults.length;
                if (!resultLen) {
                    resolve();
                    return oldSearchState;
                }

                const currIndex = oldSearchState.currentSearchResultIndex;
                let newIndex = currIndex + delta;
                // Clip new index to be between [0, searchState.searchResults.length)
                newIndex =
                    (newIndex < 0 ? newIndex + resultLen : newIndex) %
                    resultLen;

                if (jumpToResult) {
                    jumpToResult(
                        oldSearchState.searchResults[newIndex]
                    ).then(() => resolve());
                } else {
                    resolve();
                }

                return {
                    ...oldSearchState,
                    currentSearchResultIndex: newIndex,
                };
            });
        });
    }, []);

    const onReplace = useCallback(
        (all: boolean = false) => {
            if (all) {
                replace(searchState.searchResults, searchState.replaceString);
            } else {
                replace(
                    [
                        searchState.searchResults[
                            searchState.currentSearchResultIndex
                        ],
                    ],
                    searchState.replaceString
                );
                // Special case last item is replaced
                if (
                    searchState.currentSearchResultIndex ===
                    searchState.searchResults.length - 1
                ) {
                    // we loop over to the first item
                    moveResultIndex(1);
                }
            }
        },
        [
            replace,
            searchState.searchResults,
            searchState.replaceString,
            searchState.currentSearchResultIndex,
            moveResultIndex,
        ]
    );

    useEffect(() => {
        performSearch(true);
    }, [searchState.searchString, searchState.searchOptions]);

    return {
        searchAndReplaceContext: {
            searchState,
            focusSearchBar,
        },
        searchAndReplaceProps: {
            onSearchStringChange,
            onReplaceStringChange,
            onReplace,
            onSearchOptionsChange,
            moveResultIndex,
        },
        reset,
        performSearch,
    };
}

export interface ISearchAndReplaceHandles {
    performSearch: (isActiveSearch?: boolean) => void;
    reset: () => void;
}

export const SearchAndReplace: React.FC<
    ISearchAndReplaceProps & {
        ref: React.Ref<ISearchAndReplaceHandles>;
    }
> = React.forwardRef<ISearchAndReplaceHandles, ISearchAndReplaceProps>(
    ({ getSearchResults, jumpToResult, replace, children }, ref) => {
        const [showSearchAndReplace, setShowSearchAndReplace] = useState(false);
        const searchBarRef = useRef<ISearchAndReplaceBarHandles>(null);
        const focusSearchBar = useCallback(() => {
            searchBarRef.current?.focus();
        }, []);
        const {
            searchAndReplaceContext,
            searchAndReplaceProps,
            performSearch,
            reset,
        } = useSearchAndReplace({
            getSearchResults,
            replace,
            jumpToResult,
            focusSearchBar,
        });

        useImperativeHandle(
            ref,
            () => ({
                performSearch,
                reset,
            }),
            [performSearch, reset]
        );

        const onKeyDown = useCallback(
            (evt: KeyboardEvent) => {
                let handled = true;
                if (matchKeyPress(evt, 'Cmd-F')) {
                    if (!showSearchAndReplace) {
                        setShowSearchAndReplace(true);
                    } else {
                        focusSearchBar();
                    }
                } else if (showSearchAndReplace && matchKeyPress(evt, 'esc')) {
                    setShowSearchAndReplace(false);
                } else {
                    handled = false;
                }

                if (handled) {
                    evt.stopPropagation();
                    evt.preventDefault();
                }
            },
            [showSearchAndReplace, focusSearchBar]
        );
        useWindowEvent('keydown', onKeyDown);

        return (
            <SearchAndReplaceContext.Provider value={searchAndReplaceContext}>
                {showSearchAndReplace ? (
                    <SearchAndReplaceBar
                        ref={searchBarRef}
                        {...searchAndReplaceProps}
                        onHide={() => setShowSearchAndReplace(false)}
                    />
                ) : null}
                {children}
            </SearchAndReplaceContext.Provider>
        );
    }
);
