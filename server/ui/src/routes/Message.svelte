<script lang="ts">
  import { browser } from '$app/environment';
  import { writable } from 'svelte/store';

  let message = writable('Nothing yet!');
  let actualTime = writable('Nothing yet!');

  if (browser) {
    window.addEventListener('message', (event) => {
      console.log(event);
      message.set(event.data.message); // The JSON data our extension sent
    });

    setInterval(() => {
      actualTime.set(new Date().toLocaleTimeString());
    }, 10);
  }
</script>

<div>
  <h3>We received a message from VSCode...</h3>
  <code>{$message}</code>
</div>
<div>
  <h3>Our own setInterval says...</h3>
  <code>{$actualTime}</code>
</div>
