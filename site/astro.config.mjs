// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	site: 'https://floci-studio.dev',
	integrations: [
		starlight({
			title: 'Floci Studio',
			description: 'The local AWS cockpit for AI-native development',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/pmaojo/floci-studio' },
			],
			customCss: ['./src/styles/custom.css'],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Quick Start', slug: 'getting-started' },
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'Configuration', slug: 'getting-started/configuration' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'SQS — Queues & Messages', slug: 'guides/sqs' },
						{ label: 'SNS — Topics & Subscriptions', slug: 'guides/sns' },
						{ label: 'SES — Email', slug: 'guides/ses' },
						{ label: 'Lambda Functions', slug: 'guides/lambda' },
						{ label: 'S3 Storage', slug: 'guides/s3' },
						{ label: 'Marketplace Recipes', slug: 'guides/marketplace' },
					],
				},
				{
					label: 'Enterprise',
					items: [
						{ label: 'Observability & Debugging', slug: 'enterprise/observability' },
						{ label: 'IaC Drift Detection', slug: 'enterprise/iac-drift' },
						{ label: 'Hybrid Development', slug: 'enterprise/hybrid' },
						{ label: 'Extensibility & Plugins', slug: 'enterprise/extensibility' },
					],
				},
				{
					label: 'MCP Server',
					items: [
						{ label: 'Overview', slug: 'mcp/overview' },
						{ label: 'Connect Claude / Cursor', slug: 'mcp/setup' },
						{ label: 'Tools Reference', slug: 'mcp/tools-reference' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'AWS Service Coverage', slug: 'reference/aws-services' },
						{ label: 'Marketplace Recipes', slug: 'reference/recipes' },
					],
				},
			],
		}),
	],
});
