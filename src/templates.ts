import { Workflow, WorkflowNode, NodeLink } from './types';

export interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  nodes: Omit<WorkflowNode, 'id' | 'workflowId' | 'createdAt' | 'updatedAt'>[];
  links: Omit<NodeLink, 'id' | 'workflowId'>[];
}

export const TEMPLATES: Template[] = [
  {
    id: 't-fullstack-vite',
    title: 'Modern Full-Stack Deployment Router',
    description: 'Vite Front-end + Express Backend + Environment Security mapping. Designed for quick developer scaffolding.',
    category: 'Architecture',
    nodes: [
      {
        type: 'step',
        title: 'Initialize Workspace & Monorepo',
        content: 'Create a root package.json, configure workspace dependencies, and prepare the folder structure.',
        summary: 'Use the official build command. Ensure no nested duplicate scripts are running. Hardcode host to 0.0.0.0 and port 3000 to be accessible.',
        sourceUrl: 'https://vitejs.dev/guide/',
        sourceTitle: 'Vite Guide',
        confidenceScore: 95,
        rating: 5,
        status: 'trusted',
        positionX: 100,
        positionY: 150,
        tags: ['scaffold', 'node', 'vite']
      },
      {
        type: 'step',
        title: 'Configure Tailwind CSS',
        content: 'Import Tailwind components into index.css and bundle in your bundler/compiler (e.g. @tailwindcss/vite).',
        summary: 'Directly use @import "tailwindcss" in the entry css file. Never include redundant or old PostCSS configs unless requested.',
        sourceUrl: 'https://tailwindcss.com/docs/installation',
        sourceTitle: 'Tailwind CSS Docs',
        confidenceScore: 100,
        rating: 5,
        status: 'trusted',
        positionX: 350,
        positionY: 150,
        tags: ['css', 'styling', 'tailwind']
      },
      {
        type: 'tool',
        title: 'Express Dev Server (server.ts)',
        content: 'Setup Express with tsx to run directly in dev mode on port 3000.',
        summary: 'Import CreateServer from vite as a development middleware. Distribute static files from index.html in production modes.',
        sourceUrl: 'https://expressjs.com/',
        sourceTitle: 'Express Docs',
        confidenceScore: 90,
        rating: 4,
        status: 'trusted',
        positionX: 600,
        positionY: 150,
        tags: ['backend', 'express', 'node']
      },
      {
        type: 'step',
        title: 'Configure Environment Security (.env.example)',
        content: 'Declare all required variables in .env.example. Never commit actual secret keys like GEMINI_API_KEY to the repo.',
        summary: 'Validate the presence of important environment variables before booting any server-side SDK clients.',
        sourceUrl: '',
        sourceTitle: '',
        confidenceScore: 85,
        rating: 4,
        status: 'experimental',
        positionX: 850,
        positionY: 280,
        tags: ['security', 'env', 'secrets']
      },
      {
        type: 'step',
        title: 'Continuous Deployment to Cloud Run',
        content: 'Configure GitHub Actions or direct console triggers to build a container and deploy onto gcloud Cloud Run service.',
        summary: 'Expose port 3000 inside your Dockerfile. Ensure correct environment variable injection in the cloud provider console.',
        sourceUrl: 'https://cloud.google.com/run/docs/deploying',
        sourceTitle: 'Google Cloud Run Docs',
        confidenceScore: 75,
        rating: 3,
        status: 'experimental',
        positionX: 1100,
        positionY: 280,
        tags: ['devops', 'cloud-run', 'ci-cd']
      },
      {
        type: 'note',
        title: 'Optimization Note regarding HMR',
        content: 'During agent edits or inside iframe test containers, disable HMR via DISABLE_HMR=true to save CPU and avoid server flashing.',
        summary: 'Always design your client-side variables with standard state backup so that manual tree refreshes do not corrupt working store memory.',
        sourceUrl: '',
        sourceTitle: '',
        confidenceScore: 95,
        rating: 5,
        status: 'trusted',
        positionX: 600,
        positionY: 420,
        tags: ['optimization', 'development']
      }
    ],
    links: [
      { fromNodeId: '0', toNodeId: '1', label: 'Styles build' },
      { fromNodeId: '1', toNodeId: '2', label: 'Asset serving proxy' },
      { fromNodeId: '2', toNodeId: '3', label: 'Secure controller' },
      { fromNodeId: '3', toNodeId: '4', label: 'Release trigger' },
      { fromNodeId: '2', toNodeId: '5', label: 'Local caching policy' }
    ]
  },
  {
    id: 't-gemini-agentic',
    title: 'Agentic LLM RAG Pipeline',
    description: 'Visual wireflow scaffolding for embedding Gemini API into modern React workflows. Includes citation tracking.',
    category: 'AI Pipeline',
    nodes: [
      {
        type: 'tool',
        title: 'Gemini SDK (@google/genai)',
        content: 'Initialize GoogleGenAI client on the backend using the server-side environment key process.env.GEMINI_API_KEY.',
        summary: 'Always perform API proxy calls via router handlers `/api/gemini` rather than requesting the credentials on the client to avoid exposure.',
        sourceUrl: 'https://www.npmjs.com/package/@google/genai',
        sourceTitle: 'Google GenAI SDK on NPM',
        confidenceScore: 95,
        rating: 5,
        status: 'trusted',
        positionX: 100,
        positionY: 200,
        tags: ['ai', 'gemini', 'backend']
      },
      {
        type: 'step',
        title: 'Vector Embeddings Builder',
        content: 'Pre-process developer tutorial files, index content headers, and generate semantic embeddings.',
        summary: 'Leverage gemini text-embedding models to convert notes or code files into multi-dimensional vectors for query mapping.',
        sourceUrl: 'https://ai.google.dev/gemini-api/docs/embeddings',
        sourceTitle: 'Gemini Embeddings Docs',
        confidenceScore: 80,
        rating: 4,
        status: 'experimental',
        positionX: 350,
        positionY: 200,
        tags: ['ai', 'embeddings', 'preprocessing']
      },
      {
        type: 'step',
        title: 'Retrieve Context & Grounding',
        content: 'Query the user question, pull the top-k most similar chunks, and build the context grounding structure.',
        summary: 'Enrich the prompt by appending the matched text segments. Feed the composite into Gemini with a system prompt specifying strict grounding.',
        sourceUrl: '',
        sourceTitle: '',
        confidenceScore: 85,
        rating: 4,
        status: 'trusted',
        positionX: 600,
        positionY: 200,
        tags: ['rag', 'retrieval', 'context']
      },
      {
        type: 'video',
        title: 'Tutorial: Understanding Grounding with Sources',
        content: 'Video outlining how sourcing and confidence scores defend against AI hallucinations.',
        summary: 'Walkthrough explaining the system-level validation of LLM outputs. Recommends attaching trust tags based on factual coverage.',
        sourceUrl: 'https://www.youtube.com/watch?v=R8QA6tWej3o',
        sourceTitle: 'RAG Grounding Basics Video',
        confidenceScore: 90,
        rating: 5,
        status: 'trusted',
        positionX: 600,
        positionY: 420,
        tags: ['learning', 'video', 'concepts']
      },
      {
        type: 'link',
        title: 'Google AI Grounding Guide',
        content: 'Official developer guidelines for enterprise search grounding and citation labels.',
        summary: 'Technical manual outlining the implementation of trust verification parameters in live app previews.',
        sourceUrl: 'https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/grounding',
        sourceTitle: 'Vertex AI Sourcing Guide',
        confidenceScore: 95,
        rating: 5,
        status: 'trusted',
        positionX: 850,
        positionY: 200,
        tags: ['documentation', 'reference']
      }
    ],
    links: [
      { fromNodeId: '0', toNodeId: '1', label: 'Index model' },
      { fromNodeId: '1', toNodeId: '2', label: 'Grounding search' },
      { fromNodeId: '3', toNodeId: '2', label: 'Tutorial link' },
      { fromNodeId: '2', toNodeId: '4', label: 'Verify citation links' }
    ]
  },
  {
    id: 't-indie-hacker',
    title: 'Indie Builder Launch Campaign',
    description: 'Clean visual checklist for setting up Stripe licensing, Product Hunt triggers, and analytics feedback channels.',
    category: 'Marketing',
    nodes: [
      {
        type: 'step',
        title: 'Define MVP Landing Page',
        content: 'Draft a crisp headline conveying real-time utility, with clean call-to-actions and zero marketing fluff.',
        summary: 'Optimize page size, use highly readable layout grids, and make sure action buttons have a clear visual responsive callback pattern.',
        sourceUrl: '',
        sourceTitle: '',
        confidenceScore: 100,
        rating: 5,
        status: 'trusted',
        positionX: 100,
        positionY: 150,
        tags: ['frontend', 'conversion']
      },
      {
        type: 'tool',
        title: 'Stripe Portal Integration',
        content: 'Integrate the Stripe pricing page redirect. Prefer server-side API routers inside our Express backend to execute secure checkout sessions.',
        summary: 'Validate client signature and transaction status via secure webhooks inside server.ts before upgrading customer profiles.',
        sourceUrl: 'https://stripe.com/docs/billing/quickstart',
        sourceTitle: 'Stripe Billing Quickstart',
        confidenceScore: 95,
        rating: 5,
        status: 'trusted',
        positionX: 350,
        positionY: 150,
        tags: ['saas', 'billing', 'stripe']
      },
      {
        type: 'step',
        title: 'SEO Sitemap & Analytics Setup',
        content: 'Submit index paths to Google Search Console. Set non-invasive feature tracking flags to monitor UI interactions.',
        summary: 'Never use heavy tracking scripts that compromise page speed or access credentials.',
        sourceUrl: '',
        sourceTitle: '',
        confidenceScore: 80,
        rating: 4,
        status: 'experimental',
        positionX: 600,
        positionY: 150,
        tags: ['seo', 'marketing']
      }
    ],
    links: [
      { fromNodeId: '0', toNodeId: '1', label: 'Integrate Paywall' },
      { fromNodeId: '1', toNodeId: '2', label: 'Track Performance' }
    ]
  }
];
