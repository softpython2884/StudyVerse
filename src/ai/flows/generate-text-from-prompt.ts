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
  prompt: `You are an expert assistant. Respond to the following prompt in a comprehensive and well-structured manner.
If the request is a question, answer it thoroughly.
If it is an instruction, follow it.
The response should be formatted in simple HTML (p, b, i, ul, ol, li tags) for direct injection into a rich text editor.

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
