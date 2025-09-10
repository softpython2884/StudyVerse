'use server';
/**
 * @fileOverview An AI agent that generates text from a given prompt.
 *
 * - generateTextFromPrompt - A function that generates a detailed response to a prompt.
 * - GenerateTextFromPromptInput - The input type for the function.
 * - GenerateTextFromPromptOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTextFromPromptInputSchema = z.object({
  prompt: z.string().describe('The user prompt to generate text from.'),
});
export type GenerateTextFromPromptInput = z.infer<
  typeof GenerateTextFromPromptInputSchema
>;

const GenerateTextFromPromptOutputSchema = z.object({
  response: z
    .string()
    .describe('The generated text response. Should be well-formatted.'),
});
export type GenerateTextFromPromptOutput = z.infer<
  typeof GenerateTextFromPromptOutputSchema
>;

export async function generateTextFromPrompt(
  input: GenerateTextFromPromptInput
): Promise<GenerateTextFromPromptOutput> {
  return generateTextFromPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTextPrompt',
  input: {schema: GenerateTextFromPromptInputSchema},
  output: {schema: GenerateTextFromPromptOutputSchema},
  prompt: `You are an expert writer and researcher. Your task is to generate a comprehensive, well-structured, and detailed document based on the user's prompt.

Follow these steps:
1.  Thoroughly analyze the user's prompt to understand the core topic and requirements.
2.  If the topic is complex, break it down into logical main sections.
3.  For each main section, create detailed subsections and even sub-subsections if necessary to cover the topic exhaustively.
4.  Write detailed, informative, and engaging content for each section and subsection.
5.  Format the entire output in clean, simple HTML, using appropriate tags like <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <b>, and <i>.
6.  The final output should be a complete document, ready to be inserted into a rich text editor. Do not include any explanations, only the HTML content.

Prompt: {{{prompt}}}
`,
});

const generateTextFromPromptFlow = ai.defineFlow(
  {
    name: 'generateTextFromPromptFlow',
    inputSchema: GenerateTextFromPromptInputSchema,
    outputSchema: GenerateTextFromPromptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
