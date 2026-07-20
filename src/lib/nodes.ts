export type NodeId = 'de' | 'ee' | 'nl' | 'pl';
export type LabelKey = 'germany' | 'estonia' | 'netherlands' | 'poland';

export interface Server {
  value: NodeId;
  flagImg: string;
  labelKey: LabelKey;
  ip: string;
  pingUrl: string;
}

export const servers: Server[] = [
  {
    value: 'de',
    flagImg: 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f1e9-1f1ea.png',
    labelKey: 'germany',
    ip: '203.0.113.11',
    pingUrl: 'https://lg-de.your-domain.com/health',
  },
  {
    value: 'ee',
    flagImg: 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f1ea-1f1ea.png',
    labelKey: 'estonia',
    ip: '203.0.113.14',
    pingUrl: 'https://lg-ee.your-domain.com/health',
  },
  {
    value: 'nl',
    flagImg: 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f1f3-1f1f1.png',
    labelKey: 'netherlands',
    ip: '203.0.113.15',
    pingUrl: 'https://lg-nl.your-domain.com/health',
  },
  {
    value: 'pl',
    flagImg: 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f1f5-1f1f1.png',
    labelKey: 'poland',
    ip: '203.0.113.13',
    pingUrl: 'https://lg-pl.your-domain.com/health',
  },
];

export const iperf3Hosts: Record<NodeId, string> = {
  de: '203.0.113.11',
  ee: '203.0.113.14',
  nl: '203.0.113.15',
  pl: '203.0.113.13',
};

export const testfileHosts: Record<NodeId, string> = {
  de: 'https://lg-de.your-domain.com',
  ee: 'https://lg-ee.your-domain.com',
  nl: 'https://lg-nl.your-domain.com',
  pl: 'https://lg-pl.your-domain.com',
};

export const commands = [
  { value: 'ping', label: 'Ping' },
  { value: 'traceroute', label: 'Traceroute' },
  { value: 'mtr', label: 'MTR' },
] as const;

export type CommandValue = (typeof commands)[number]['value'];
