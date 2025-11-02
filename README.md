#<div align="center">

# 🎮 Mi Actividad en Steam

![Steam Widget](steam-widget.svg)

> **Se actualiza cada 30 minutos**  
> Última actualización: `<!-- Fecha automática -->` <span id="last-update"></span>

</div>

<script>
  fetch('steam-widget.svg')
    .then(r => r.text())
    .then(text => {
      const match = text.match(/Última conexión: ([^<]+)/);
      if (match) {
        document.getElementById('last-update').textContent = match[1];
      }
    });
</script>

---

### Mis Stats
- **Nivel Steam**: 47
- **Juegos**: 305
- **Jugando ahora**: Wallpaper Engine

---

> **¡Copia este código en tu perfil de GitHub!**  
> Solo cambia `punketa/steam-widget` por tu usuario/repo.

```markdown
<image-card alt="Mi Steam" src="https://github.com/punketa/steam-widget/blob/main/steam-widget.svg" ></image-card>
