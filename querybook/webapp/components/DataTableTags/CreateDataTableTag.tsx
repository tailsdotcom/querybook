import * as React from 'react';
import { useDispatch } from 'react-redux';

import { ITag } from 'const/tag';
import { createTableTag } from 'redux/tag/action';
import { Dispatch } from 'redux/store/types';

import { TableTagSelect } from './TableTagSelect';
import { IconButton } from 'ui/Button/IconButton';

import './CreateDataTableTag.scss';

interface IProps {
    tableId: number;
    tags: ITag[];
}

export const CreateDataTableTag: React.FunctionComponent<IProps> = ({
    tableId,
    tags,
}) => {
    const dispatch: Dispatch = useDispatch();
    const [showSelect, setShowSelect] = React.useState(false);

    const existingTags = React.useMemo(
        () => (tags || []).map((tag) => tag.name),
        [tags]
    );

    const createTag = React.useCallback(
        (tag: string) => dispatch(createTableTag(tableId, tag)),
        [tableId, dispatch]
    );

    const isValidCheck = React.useCallback(
        (val: string) => {
            const regex = /^[a-z0-9]{1,255}$/i;
            const match = val.match(regex);
            return Boolean(match && !existingTags.includes(val));
        },
        [existingTags]
    );

    const handleCreateTag = React.useCallback(
        (val: string) => {
            createTag(val).finally(() => setShowSelect(false));
        },
        [createTag]
    );

    return (
        <div className="CreateDataTableTag flex-row">
            {showSelect ? (
                <div className="CreateDataTableTag-input flex-row">
                    <TableTagSelect
                        onSelect={handleCreateTag}
                        isValidCheck={isValidCheck}
                        existingTags={existingTags}
                    />
                </div>
            ) : (
                <IconButton
                    icon="Plus"
                    onClick={() => setShowSelect(true)}
                    tooltip="Add tag"
                    tooltipPos="down"
                    size={18}
                    invertCircle
                />
            )}
        </div>
    );
};
