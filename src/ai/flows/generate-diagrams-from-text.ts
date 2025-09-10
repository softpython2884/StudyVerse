'use server';
/**
 * @fileOverview AI agent that generates diagrams from text.
 *
 * - generateDiagram - A function that generates diagrams from text.
 * - GenerateDiagramInput - The input type for the generateDiagram function.
 * - GenerateDiagramOutput - The return type for the generateDiagram function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDiagramInputSchema = z.object({
  text: z.string().describe('The text to generate a diagram from.'),
  format: z
    .enum(['markdown', 'latex', 'txt'])
    .default('markdown')
    .describe('The desired output format for the diagram.'),
});
export type GenerateDiagramInput = z.infer<typeof GenerateDiagramInputSchema>;

const GenerateDiagramOutputSchema = z.object({
  diagram: z.string().describe('The generated diagram in the specified format.'),
});
export type GenerateDiagramOutput = z.infer<typeof GenerateDiagramOutputSchema>;

export async function generateDiagram(input: GenerateDiagramInput): Promise<GenerateDiagramOutput> {
  return generateDiagramFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDiagramPrompt',
  input: {schema: GenerateDiagramInputSchema},
  output: {schema: GenerateDiagramOutputSchema},
  prompt: `You are an expert diagram generator. You convert natural language descriptions into structured diagram formats.

Your task is to generate a diagram from the given text in the specified format. The output should be only the diagram code or text, without any additional explanation.

For 'txt' format, use ASCII characters to draw the diagram.
For 'markdown', use Mermaid.js syntax inside a '\`\`\`mermaid' code block.
For 'latex', use appropriate LaTeX packages like TikZ.

Text: {{{text}}}
Format: {{{format}}}

Diagram:`,
});

const generateDiagramFlow = ai.defineFlow(
  {
    name: 'generateDiagramFlow',
    inputSchema: GenerateDiagramInputSchema,
    outputSchema: GenerateDiagramOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
