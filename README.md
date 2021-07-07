# XY-To-HTML
Quite complex algorithm to build HTML grid layout from absolute positioned elements. You have:

```
<div class="comp" id="C2C0EA52-75F1-4AF6-96E0-FB2EAF06A56E" style="
        top: 4380px;
        left: 0px;
        width: 1180px;
        height: 260px;
        z-index: 1;
        background-color: gray;
        "></div>
<div class="comp" id="AF4FD733-CFEF-45B4-9767-0260C33A983C" style="
        top: 4433px;
        left: 0px;
        width: 334px;
        height: 154px;
        z-index: 6;
        background-color: black;
        "></div>
        ...
```
Output:
```
<div class="compFl" id="E8A82074-D84C-4D3D-8A30-A488FF7A9C47" style="
        width: 1180px;
        min-height: 80px;
        background-color: gray;
        "><div class="row"><div class="col" style="min-height: 50px; margin-top: 16px; margin-left: 0px"><div class="compFl" id="7FFAD529-E4F4-4FF4-9B4A-E9FE8F4169AF" style="
        width: 210px;
        min-height: 50px;
        background-color: black;
        "></div><br class="cl"></div><div class="col" style="min-height: 80px; margin-top: 0px; margin-left: 396px"><div class="compFl" id="41C73969-6468-484F-BA3F-9D40A0BBDC45" style="
        width: 459px;
        min-height: 80px;
        background-color: undefined;
        "></div><br class="cl"></div></div></div>
```

Check [wiki](https://github.com/Anton-Gusarov/XY-To-HTML/wiki) for thorough documentation

[Demo](https://serene-depths-35688.herokuapp.com/)

The code is documented as well. There is no perfect project structure, it is as is.
