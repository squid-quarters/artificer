<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import DenseCard from './dense-card.svelte';
  import fixture from '../../../fixtures/neutral-project/project.artificer.json';
  const { Story } = defineMeta({ title: 'Artificer/DenseCard', component: DenseCard });
</script>
<Story name="Neutral dense fixture" args={{ card: fixture.cards[0], template: fixture.templates[0] }} />
