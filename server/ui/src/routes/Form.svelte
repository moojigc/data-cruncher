<script lang="ts">
  function submit(event: any) {
    console.log(event);
    console.log(event.target);
    console.log(event.target.name);
    console.log(event.target.email);
  }
</script>

<form on:submit|preventDefault={submit}>
  <label for="name">Name</label>
  <input type="text" id="name" name="name" />
  <label for="email">Email</label>
  <input type="email" id="email" name="email" />
  <button type="submit">Submit</button>
</form>
