import { Tabs } from '../../shared/Tabs';

type Props = {
  activeTab: 'unassigned' | 'assigned';
  unassignedCount: number;
  assignedCount: number;
  onTabChange: (tab: 'unassigned' | 'assigned') => void;
};

export function AssignmentTabs({ activeTab, unassignedCount, assignedCount, onTabChange }: Props) {
  const tabs = [
    {
      id: 'unassigned',
      label: 'Unassigned Students',
      count: unassignedCount
    },
    {
      id: 'assigned',
      label: 'Assigned Students',
      count: assignedCount
    }
  ];

  return (
    <Tabs
      tabs={tabs}
      activeTab={activeTab}
      onChange={onTabChange}
    />
  );
}