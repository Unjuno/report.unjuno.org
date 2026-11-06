export const residual=(x,f)=>({sum:x+f,output:Math.max(0,x+f)});
export function shape(mode){return mode==='same'?{input:'56×56×64',branch:'56×56×64',shortcut:'56×56×64',params:0,note:'恒等 shortcut：形を保ち、学習パラメータは0。'}:{input:'56×56×64',branch:'28×28×128',shortcut:'28×28×128',params:64*128,note:'1×1、stride 2、64→128チャネル。重みは8,192個（バイアス・BNを除く）。'};}
export const chain=(n,a)=>({plain:a**n,residual:(1+a)**n});
export const blockParams=(c,b)=>({basic:18*c*c,bottleneck:2*c*b+9*b*b});
export const evidence={plain:[27.94,28.54],residual:[27.88,25.03]};
