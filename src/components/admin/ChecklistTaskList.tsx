import styled from '@emotion/styled';
import type { ReactNode } from 'react';

import type { ChecklistStepCopy } from '../../adminLocales';
import { ChecklistTask } from './ChecklistTask';

const List = styled.ol`
	display: grid;
	margin: 0;
	padding: 0;
	list-style: none;
`;

export type ChecklistTaskListProps = {
	steps: readonly ChecklistStepCopy[];
	/** What a step needs under its words, by the step's id. */
	extras?: Partial<Record<string, ReactNode>>;
};

/** A group of steps, in order, each ticked off on its own. */
export function ChecklistTaskList({ steps, extras = {} }: ChecklistTaskListProps) {
	return (
		<List>
			{steps.map((step) => (
				<ChecklistTask key={step.id} step={step}>
					{extras[step.id]}
				</ChecklistTask>
			))}
		</List>
	);
}

/** The ids of steps, for counting how many are done. */
export function stepIds(...groups: (readonly ChecklistStepCopy[])[]): string[] {
	return groups.flat().map((step) => step.id);
}
