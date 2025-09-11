'use server';
/**
 * @fileOverview An AI agent for spell and grammar checking.
 *
 * - spellCheck - A function that corrects spelling and grammar in a given text.
 * - SpellCheckInput - The input type for the spellCheck function.
 * - SpellCheckOutput - The return type for the spellCheck function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SpellCheckInputSchema = z.object({
  text: z.string().describe('The HTML text to be checked.'),
});
export type SpellCheckInput = z.infer<typeof SpellCheckInputSchema>;

const SpellCheckOutputSchema = z.object({
  correctedText: z
    .string()
    .describe(
      'The corrected HTML text. If there are no corrections, return the original HTML text.'
    ),
});
export type SpellCheckOutput = z.infer<typeof SpellCheckOutputSchema>;

export async function spellCheck(
  input: SpellCheckInput
): Promise<SpellCheckOutput> {
  // If the text is very short or empty, no need to call the AI
  if (input.text.trim().length < 2) {
    return {correctedText: input.text};
  }
  return spellCheckFlow(input);
}

const prompt = ai.definePrompt({
  name: 'spellCheckPrompt',
  input: {schema: SpellCheckInputSchema},
  output: {schema: SpellCheckOutputSchema},
  prompt: `You are an expert spell and grammar checker.
First, automatically detect the language of the provided HTML content.
Then, correct the spelling and grammar of the text content within the HTML.
CRITICAL: Only modify the text content. Do NOT alter any HTML tags, attributes, or the overall structure.
Only return the corrected HTML, without any preamble, explanation, or markdown.
If no corrections are needed, return the original HTML text.

HTML Text: {{{text}}}
`,
});

const spellCheckFlow = ai.defineFlow(
  {
    name: 'spellCheckFlow',
    inputSchema: SpellCheckInputSchema,
    outputSchema: SpellCheckOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
