/* ================================================================
   WORLD 4 — CONVOLUTION & CNNs (the missing staple of the DL arc).
   Two lessons slotted between ml-mlp and ml-embed:
     A · ml-conv  (order 51.3) — Convolution: the Sliding Dot Product
     B · ml-cnn   (order 51.6) — Feature Hierarchies: Why CNNs See
   ml-mlp has effective order 51 (no explicit order -> global index 51)
   and ml-embed 52, so 51.3 / 51.6 land the pair right after the MLP
   lesson on the map WITHOUT reordering any existing lesson.

   IMPORTANT (build-safety, matching the rest of the curriculum):
   Unicode symbols are fine inside string CONTENT, but every JS string
   DELIMITER is ASCII ' or ` — smart quotes as delimiters pass
   node --check yet break the real ESM + SWC build. Canvas/DOM code
   only inside the render functions. Inline math is KaTeX \\( ... \\).
   ================================================================ */
import { INTERACTIVES, registerLesson } from './registry.js';
import { makeLab, slider, chips, clearBg } from '../engine.js';

const FONT = () => getComputedStyle(document.body).fontFamily;

/* ================================================================
   LESSON A — ml-conv : Convolution: the Sliding Dot Product
   ================================================================ */
registerLesson({
  id:'ml-conv', world:'ml', order:51.3, emoji:'🪟',
  title:'Convolution: the Sliding Dot Product',
  sub:'Slide one small kernel across a signal or image, take a dot product at every stop, and you have detected a feature everywhere at once.',
  learn:`<p>An <strong>MLP</strong> connects every input to every neuron. For a 200&times;200 image that is 40,000 inputs feeding into (say) 1,000 hidden units &mdash; <strong>40 million weights</strong> in the first layer alone, and a fresh weight for every pixel position. That is wasteful: an edge is an edge whether it appears in the top-left corner or the bottom-right. <strong>Convolution</strong> is the fix.</p>
  <p>A convolution slides a tiny <strong>kernel</strong> (also called a filter) across the input. At every position it lines the kernel up with the overlapping window and computes <strong>one dot product</strong> &mdash; exactly the operation from <em>la-dot</em>. That single number becomes one entry of the <strong>output feature map</strong>:</p>
  <div class="formula">$$\\text{out}[i] = \\sum_{j} \\text{signal}[i+j]\\,\\cdot\\,\\text{kernel}[j]$$</div>
  <p>Two properties make this powerful, and both are visible in the labs:</p>
  <p>&bull; <strong>Parameter sharing</strong>: the <em>same</em> handful of kernel weights is reused at <em>every</em> position. A 3-tap kernel has 3 numbers whether the signal is 16 long or 16 million long. Compare that to the MLP's per-position weights.<br>
  &bull; <strong>Locality</strong>: each output looks only at a small neighbourhood (the kernel's <strong>receptive field</strong>), not the whole input. Nearby pixels are what form edges and textures.</p>
  <p>The kernel's numbers decide <em>which feature</em> it detects. A smoothing kernel \\([\\tfrac13,\\tfrac13,\\tfrac13]\\) averages, blurring noise away. An edge kernel \\([-1,0,1]\\) subtracts left from right, so it outputs zero on flat regions and spikes wherever the signal changes. Same sliding-dot-product machinery, entirely different job &mdash; set by three numbers (learned, in a real net).</p>
  <p>In 2-D the idea is identical: a 3&times;3 kernel slides over an image, multiply-accumulating a 3&times;3 window into one output pixel. Stack the outputs and you get a heat map of where that feature fired. The output's size follows one formula worth memorising, for input length \\(n\\), kernel size \\(k\\), padding \\(p\\), stride \\(s\\):</p>
  <div class="formula">$$n_{\\text{out}} = \\left\\lfloor \\dfrac{n - k + 2p}{s} \\right\\rfloor + 1$$</div>
  <p><strong>Padding</strong> \\(p\\) adds a border of zeros so outputs at the edge still have a full window (and can keep the output the same size as the input). <strong>Stride</strong> \\(s\\) is how far the kernel jumps each step; a stride of 2 skips every other position and <em>downsamples</em> the output.</p>`,
  ml:`Convolution is the workhorse of computer vision and the ancestor of a lot more. Every classic image network &mdash; LeNet, AlexNet, VGG, ResNet &mdash; is stacked convolutions. The parameter-sharing idea shows up again in the weight-tying of RNNs and in the fact that a transformer applies the <em>same</em> MLP to every token position. When you hear "a model that is equivariant to translation", this is the mechanism: because the kernel is reused everywhere, shifting the input just shifts the output.`,
  deeper:[
   {title:'😵 Stuck? The stencil metaphor', body:'Picture a small stencil (the kernel) that you slide across a long strip of paper (the signal). At each stop you score how well the pattern underneath matches the stencil &mdash; one number &mdash; and write it below. Move one step, score again. The row of scores is your feature map. Nothing about the stencil changes as it moves: that reuse IS parameter sharing.'},
   {title:'🚀 Go deeper: it is really cross-correlation', body:'Be honest about a naming quirk. Mathematical <em>convolution</em> flips the kernel before sliding it: \\((f*g)[i]=\\sum_j f[j]\\,g[i-j]\\). What every deep-learning framework (PyTorch <b>Conv2d</b>, TensorFlow) actually computes is <b>cross-correlation</b> &mdash; the kernel is <em>not</em> flipped, \\(\\sum_j f[i+j]\\,g[j]\\). It makes no difference to a learned network (the weights simply learn in whichever orientation), so the field kept calling it "convolution" anyway. Goodfellow, Bengio &amp; Courville, <em>Deep Learning</em> (2016), Ch.&nbsp;9, makes exactly this point.'},
   {title:'🚀 Go deeper: where this came from', body:'Yann LeCun\'s 1989 work applied backprop to a convolutional net that read handwritten ZIP-code digits &mdash; the first big win for learned convolution over hand-engineered features. It matured into <b>LeNet-5</b> (LeCun, Bottou, Bengio &amp; Haffner, "Gradient-Based Learning Applied to Document Recognition", Proc. IEEE 1998), the template every modern CNN still follows: convolutions to extract features, subsampling to shrink, a small dense head to classify.'}],
  labs:[
    {key:'conv-1d', title:'1-D convolution: slide the kernel',
     intro:'<p>A noisy <b>step</b> signal (bars) and a draggable <b>3-tap kernel</b>. As you slide the kernel, each output is the dot product of the kernel with the window under it &mdash; \\(\\text{out}=\\sum_j \\text{signal}[i+j]\\,k[j]\\). Try the smoothing preset \\([\\tfrac13,\\tfrac13,\\tfrac13]\\) and the edge detector \\([-1,0,1]\\). You can also drag any signal bar to a new height and watch the output respond.</p>',
     interactive:'conv-1d'},
    {key:'conv-2d', title:'2-D convolution on a pixel grid',
     intro:'<p>An 8&times;8 image with a bright square, and a 3&times;3 kernel. Hover the input to move the <b>receptive-field window</b>; the readout shows the nine multiply-accumulate terms that produce one output pixel. Switch between <b>blur</b>, <b>vertical-edge</b> and <b>horizontal-edge</b> (Sobel) kernels and watch the output feature-map heat change &mdash; edges light up only where the image actually changes in that direction.</p>',
     interactive:'conv-2d'},
    {key:'conv-stride-pad', title:'Stride, padding & output size',
     intro:'<p>The output size of a convolution is fixed by four numbers. Drag input size \\(n\\), kernel \\(k\\), stride \\(s\\) and padding \\(p\\), and read off:</p><div class="formula">$$n_{\\text{out}} = \\left\\lfloor \\dfrac{n - k + 2p}{s} \\right\\rfloor + 1$$</div><p>Find the <b>same</b>-padding setting (output equals input), then use stride to <b>downsample</b>.</p>',
     interactive:'conv-stride-pad'},
  ],
  quiz:[
   {q:'In a convolution, how is each single output value computed?',
    opts:['The dot product of the kernel with the aligned window of the input',
          'The sum of the entire input signal',
          'The largest input value inside the window',
          'The kernel weights added up, ignoring the input'],
    a:0, tag:'sliding dot product',
    focus:'Each output = one dot product of the kernel against the overlapping window. Re-run the 1-D lab and read the readout.',
    why:'At every position the kernel is lined up with a window of the input and multiply-accumulated into one number &mdash; the la-dot dot product, slid across.',
    wrong:{1:'A convolution looks only at the small window under the kernel, never the whole signal at once &mdash; that locality is the point.',
           2:'Taking the max in a window is pooling, a different operation covered in the next lesson.',
           3:'The input values matter enormously; the kernel weights alone tell you nothing about the data.'}},
   {q:'The same kernel weights are reused at every position as the kernel slides. What is this reuse called?',
    opts:['Parameter sharing','Pooling','Zero-padding','Batch normalization'],
    a:0, tag:'parameter sharing',
    focus:'One small kernel, reused everywhere = parameter sharing. It is why a 3-tap filter has 3 weights no matter how long the signal is.',
    why:'Reusing one kernel across all positions is parameter sharing &mdash; the reason a conv layer has so few weights compared with a fully-connected layer.',
    wrong:{1:'Pooling downsamples a feature map; it is not about reusing weights across positions.',
           2:'Zero-padding adds a border of zeros so edge windows are full; it is unrelated to weight reuse.',
           3:'Batch normalization rescales activations across a batch; it has nothing to do with sharing kernel weights.'}},
   {q:'A \\([-1,0,1]\\) edge kernel slides over a perfectly flat region (every bar the same height h). Its output there is…',
    opts:['0 &mdash; flat regions vanish under an edge detector',
          'h &mdash; it copies the height through',
          '2h &mdash; it doubles the height',
          'A large random spike'],
    a:0, tag:'edge kernel on flat region',
    focus:'On a flat window [h,h,h] the edge kernel gives -h+0+h=0. Edge detectors respond to CHANGE, not level.',
    why:'The window is [h,h,h], so the dot product with [-1,0,1] is -h + 0 + h = 0. An edge detector only fires where the signal changes.',
    wrong:{1:'The kernel has no way to pass a value straight through &mdash; the -1 and +1 cancel on any flat window.',
           2:'There is no term that could scale h up to 2h; the coefficients sum to zero.',
           3:'The output is fully determined by the (constant) window &mdash; nothing random about it, and it is exactly zero.'}},
   {type:'numeric',
    q:'Convolve (cross-correlation, no flip) the 3&times;3 window [[0,0,0],[0,0,0],[10,10,10]] with the horizontal-edge kernel [[-1,-2,-1],[0,0,0],[1,2,1]]. What single output value do you get?',
    answer:40, tol:0.5, tag:'kernel as feature detector',
    focus:'Multiply matching cells, then sum. Only the bottom row is nonzero here.',
    hint:'Only the bottom row of the window is nonzero (all 10). It meets kernel coefficients [1,2,1]: 1*10 + 2*10 + 1*10 = 40. The top and middle rows contribute 0.',
    why:'Multiply-accumulate cell by cell. Top row: 0. Middle row: 0. Bottom row: 1*10 + 2*10 + 1*10 = 40. Total = 40. A strong positive response because the image goes dark-to-bright downward, exactly what a horizontal-edge kernel detects.'},
   {type:'numeric',
    q:'A 1-D signal of length n=10 is convolved with a kernel of length k=3, stride s=1, padding p=0. How many output values (valid convolution) are produced?',
    answer:8, tol:0.5, tag:'output size formula',
    focus:'Use floor((n - k + 2p)/s) + 1. Here (10-3+0)/1 + 1.',
    hint:'Plug into floor((n - k + 2p)/s) + 1 = floor((10 - 3 + 0)/1) + 1 = 7 + 1 = 8.',
    why:'floor((10 - 3 + 0)/1) + 1 = floor(7) + 1 = 8. A length-3 kernel fits in a length-10 signal at 8 distinct positions.'},
   {q:'Increasing the stride s of a convolution (with everything else fixed)…',
    opts:['Shrinks the output &mdash; it downsamples the feature map',
          'Grows the output',
          'Has no effect on the output size',
          'Flips the kernel before sliding'],
    a:0, tag:'stride and downsampling',
    focus:'Stride = jump size. Bigger jumps -> fewer positions -> smaller output. See the denominator s in the formula.',
    why:'Stride is the step size; a larger stride visits fewer positions, so the output feature map is smaller. That is exactly why strided conv is used to downsample.',
    wrong:{1:'A bigger step lands on fewer positions, so the output gets smaller, not larger.',
           2:'The stride sits in the denominator of the size formula, so it directly changes the output size.',
           3:'Stride is about how far the kernel jumps; it has nothing to do with flipping the kernel.'}},
   {q:'You want the output to be the SAME size as the input using a 3&times;3 kernel with stride 1. What should you do?',
    opts:['Pad the input by 1 pixel on every side (p = 1)',
          'Use stride 2',
          'Remove the kernel entirely',
          'Double the number of channels'],
    a:0, tag:'padding',
    focus:'Same padding: p = (k-1)/2. For k=3 that is p=1, giving n_out = n.',
    why:'With k=3, s=1, setting p=1 gives floor((n-3+2)/1)+1 = n. This "same" padding keeps the spatial size unchanged &mdash; standard in deep stacks.',
    wrong:{1:'Stride 2 would halve the output, making it smaller, not the same size.',
           2:'Without a kernel there is no convolution at all.',
           3:'Channel count changes the DEPTH of the output, never its spatial height and width.'}},
   {q:'What deep-learning frameworks call "convolution" (e.g. Conv2d) is, strictly speaking…',
    opts:['Cross-correlation &mdash; the kernel is NOT flipped',
          'True convolution with the kernel flipped first',
          'A matrix inversion',
          'A Fourier transform of the image'],
    a:0, tag:'cross-correlation vs convolution',
    focus:'Frameworks skip the flip. It does not matter because the weights are learned. Honesty card in the lesson.',
    why:'True convolution flips the kernel; frameworks compute cross-correlation (no flip). Since the weights are learned, the orientation is irrelevant, so the misnomer stuck.',
    wrong:{1:'Mathematical convolution DOES flip the kernel &mdash; but that is not what the frameworks implement.',
           2:'No matrices are inverted; it is a sliding multiply-accumulate.',
           3:'Convolution can be computed via an FFT for speed, but the operation itself is a sliding dot product, not a Fourier transform.'}},
   {type:'order',
    q:'Put the steps for computing one output value of a convolution in the right order:',
    tag:'sliding dot product',
    steps:['Line the kernel up over one window of the input',
           'Multiply each kernel weight by the input value it overlaps',
           'Add the products together into a single output number',
           'Slide the kernel by the stride and repeat for the next output'],
    why:'Align, multiply, sum, slide. The multiply-then-sum is the dot product; sliding it across every position builds the whole feature map.'},
  ],
});

/* ---------- Lab A1 — 1-D convolution ---------- */
INTERACTIVES['conv-1d'] = function(stage, api){
  const L = makeLab(stage, {h:440});
  const ctx = L.ctx, W = L.W, H = L.H;
  const N = 16, left = 48, barW = (600 - left) / N;
  const sigBase = 178, barMaxH = 118;
  const outBase = 344, outScale = 74;
  let sig = [0.15,0.20,0.12,0.18,0.16,0.22,0.14,0.20, 0.78,0.86,0.80,0.90,0.82,0.88,0.79,0.85];
  const KERNELS = { smooth:[1/3,1/3,1/3], edge:[-1,0,1], ident:[0,1,0] };
  const KLABEL = { smooth:'[1/3, 1/3, 1/3] smoothing', edge:'[-1, 0, 1] edge detector', ident:'[0, 1, 0] identity' };
  let kname = 'smooth', pos = 0;
  const maxPos = N - 3;
  const visited = new Set();
  let edited = false;
  const kernel = () => KERNELS[kname];
  const outAt = i => { const k = kernel(); return sig[i]*k[0] + sig[i+1]*k[1] + sig[i+2]*k[2]; };

  const m = api.missions([
    {text:'Load the <b>[1/3,1/3,1/3] smoothing</b> kernel and slide it across <b>every</b> output position', xp:20,
      check:s => s.kname==='smooth' && s.visited >= maxPos + 1},
    {text:'Switch to the <b>[-1,0,1] edge detector</b> and park the window on the step edge so the output magnitude is above <b>0.5</b>', xp:25,
      check:s => s.kname==='edge' && Math.abs(s.out) > 0.5},
    {text:'<b>Edit the signal</b>: drag any bar to a new height and watch the output change', xp:15,
      check:s => s.edited},
  ]);

  function bar(x, base, h, w, col){ ctx.fillStyle = col; if(h>=0) ctx.fillRect(x, base-h, w, h); else ctx.fillRect(x, base, w, -h); }
  function draw(){
    clearBg(ctx, W, H);
    ctx.font = '600 12px ' + FONT();
    ctx.fillStyle = '#8b93b8'; ctx.textAlign='left';
    ctx.fillText('signal (drag a bar to edit)', left, 26);
    for(let i=0;i<N;i++){
      const x = left + i*barW + barW*0.12, w = barW*0.76;
      const inWin = i>=pos && i<pos+3;
      bar(x, sigBase, sig[i]*barMaxH, w, inWin ? '#ffc94d' : 'rgba(255,201,77,.32)');
    }
    ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 2.5;
    ctx.strokeRect(left + pos*barW + 2, sigBase - barMaxH - 8, barW*3 - 4, barMaxH + 16);
    ctx.fillStyle = '#b9a8ff'; ctx.font = '700 12px ' + FONT(); ctx.textAlign='center';
    const k = kernel();
    for(let j=0;j<3;j++){
      const cx = left + (pos+j)*barW + barW*0.5;
      ctx.fillText((Math.round(k[j]*100)/100).toString(), cx, sigBase - barMaxH - 14);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, outBase); ctx.lineTo(600, outBase); ctx.stroke();
    ctx.fillStyle = '#8b93b8'; ctx.font = '600 12px ' + FONT(); ctx.textAlign='left';
    ctx.fillText('output feature map (each bar = one dot product)', left, outBase + 74);
    for(let i=0;i<=maxPos;i++){
      const v = outAt(i);
      const x = left + (i+1)*barW + barW*0.12, w = barW*0.76;
      bar(x, outBase, v*outScale, w, i===pos ? '#00d4ff' : 'rgba(45,212,160,.55)');
    }
    const cur = outAt(pos);
    ctx.fillStyle = '#00d4ff'; ctx.font = '700 13px ' + FONT(); ctx.textAlign='center';
    ctx.fillText(cur.toFixed(2), left + (pos+1)*barW + barW*0.5, outBase - cur*outScale - (cur>=0?8:-16));

    const win = [sig[pos],sig[pos+1],sig[pos+2]].map(v=>v.toFixed(2)).join(', ');
    L.readout.innerHTML = 'kernel = <b>'+KLABEL[kname]+'</b><br>window = ['+win+']<br>'+
      'output = k &middot; window = <b style="color:#00d4ff">'+cur.toFixed(3)+'</b>';
    m.update({kname, pos, visited:visited.size, out:cur, edited});
  }

  const krow = chips(L.ctrl, 'KERNEL PRESET', ['smoothing [1/3,1/3,1/3]','edge [-1,0,1]','identity [0,1,0]'], (i,btn,row)=>{
    kname = ['smooth','edge','ident'][i];
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); draw();
  });
  krow.children[0].classList.add('on');
  slider(L.ctrl, 'kernel position (slide it across)', 0, maxPos, 1, 0, v=>'i = '+v, v=>{ pos = v; visited.add(v); draw(); });
  const note = document.createElement('div'); note.className='ctrl';
  note.innerHTML = '<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The <b style="color:#7c5cff">purple box</b> is the kernel window; the number under each output bar is the dot product it produced. Smoothing averages noise away; the edge detector is flat except at the step. Drag any gold signal bar to reshape the input.</div>';
  L.ctrl.appendChild(note);

  let dragging = false;
  function edit(ev){
    const c = L.toCanvas(ev);
    if(c.x < left || c.x > 600) return;
    if(c.y < sigBase - barMaxH - 12 || c.y > sigBase + 12) return;
    const idx = Math.floor((c.x - left) / barW);
    if(idx < 0 || idx >= N) return;
    sig[idx] = Math.max(0, Math.min(1, (sigBase - c.y) / barMaxH));
    edited = true; draw();
  }
  L.canvas.addEventListener('pointerdown', e=>{ dragging = true; L.canvas.setPointerCapture(e.pointerId); edit(e); });
  L.canvas.addEventListener('pointermove', e=>{ if(dragging) edit(e); });
  L.canvas.addEventListener('pointerup', ()=>{ dragging = false; });

  draw();
  api.predict({
    prompt:'The <b>[-1,0,1] edge detector</b> slides over a perfectly <b>flat</b> region (every bar the same height h). What does it output there?',
    choices:['0 &mdash; flat regions vanish','h &mdash; it copies the height through','2h &mdash; it doubles the height','A large spike'],
    answer:0,
    reveal:'On a flat patch every window is [h, h, h], so the dot product with [-1, 0, 1] is \\(-h + 0 + h = 0\\). Edge detectors respond only to <b>change</b> &mdash; which is why the same kernel that ignores smooth areas lights up sharply at the step.'
  });
};

/* ---------- Lab A2 — 2-D convolution ---------- */
INTERACTIVES['conv-2d'] = function(stage, api){
  const L = makeLab(stage, {h:470});
  const ctx = L.ctx, W = L.W, H = L.H;
  const N = 8, ON = N - 2;
  const img = [];
  for(let r=0;r<N;r++){ img[r]=[]; for(let c=0;c<N;c++){ img[r][c] = (r>=2&&r<=5&&c>=2&&c<=5) ? 0.9 : 0.1; } }
  const K = {
    blur:  [[1/9,1/9,1/9],[1/9,1/9,1/9],[1/9,1/9,1/9]],
    vedge: [[-1,0,1],[-2,0,2],[-1,0,1]],
    hedge: [[-1,-2,-1],[0,0,0],[1,2,1]],
  };
  const KLABEL = { blur:'3x3 blur (box average)', vedge:'vertical-edge Sobel', hedge:'horizontal-edge Sobel' };
  let kname = 'vedge';
  let sel = {r:2, c:2};
  let moved = false;
  const conv = (or,oc) => { const k=K[kname]; let s=0; for(let i=0;i<3;i++) for(let j=0;j<3;j++) s += img[or+i][oc+j]*k[i][j]; return s; };

  const m = api.missions([
    {text:'Select the <b>vertical-edge</b> kernel and hover over a vertical edge of the square until the output magnitude is above <b>1.5</b>', xp:22,
      check:s => s.kname==='vedge' && Math.abs(s.out) > 1.5},
    {text:'Switch to the <b>horizontal-edge</b> kernel and find a strong response (magnitude above <b>1.5</b>) on a top/bottom edge', xp:22,
      check:s => s.kname==='hedge' && Math.abs(s.out) > 1.5},
    {text:'Select the <b>blur</b> kernel and move the window &mdash; note the output is smooth, never spiky', xp:16,
      check:s => s.kname==='blur' && s.moved},
  ]);

  const iox=28, ioy=70, icell=30;
  const oox=360, ooy=70, ocell=38;
  function heat(v, maxA){
    if(kname==='blur'){ const g = Math.round(v*255); return 'rgb('+g+','+g+','+g+')'; }
    const t = Math.max(-1, Math.min(1, v / (maxA||1)));
    if(t>=0){ const a=Math.round(60+t*195); return 'rgb('+a+',60,70)'; }
    const a=Math.round(60-t*195); return 'rgb(70,80,'+a+')';
  }
  function draw(){
    clearBg(ctx, W, H);
    ctx.font='700 13px '+FONT(); ctx.fillStyle='#cdd4f0'; ctx.textAlign='left';
    ctx.fillText('input image (8x8)', iox, ioy-14);
    ctx.fillText('output feature map (6x6)', oox, ooy-14);
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      const g = Math.round(img[r][c]*255);
      ctx.fillStyle='rgb('+g+','+g+','+g+')';
      ctx.fillRect(iox+c*icell, ioy+r*icell, icell-1, icell-1);
    }
    ctx.strokeStyle='#7c5cff'; ctx.lineWidth=3;
    ctx.strokeRect(iox+sel.c*icell-1, ioy+sel.r*icell-1, icell*3, icell*3);
    let maxA=0.001; const out=[];
    for(let or=0;or<ON;or++){ out[or]=[]; for(let oc=0;oc<ON;oc++){ const v=conv(or,oc); out[or][oc]=v; maxA=Math.max(maxA,Math.abs(v)); } }
    for(let or=0;or<ON;or++) for(let oc=0;oc<ON;oc++){
      ctx.fillStyle=heat(out[or][oc], maxA);
      ctx.fillRect(oox+oc*ocell, ooy+or*ocell, ocell-1, ocell-1);
    }
    ctx.strokeStyle='#00d4ff'; ctx.lineWidth=3;
    ctx.strokeRect(oox+sel.c*ocell-1, ooy+sel.r*ocell-1, ocell, ocell);

    const k=K[kname]; const terms=[];
    for(let i=0;i<3;i++) for(let j=0;j<3;j++){
      const kv = Math.round(k[i][j]*100)/100;
      terms.push('('+img[sel.r+i][sel.c+j].toFixed(1)+'&times;'+kv+')');
    }
    const cur=conv(sel.r,sel.c);
    L.readout.innerHTML='kernel = <b>'+KLABEL[kname]+'</b><br>output[row '+sel.r+', col '+sel.c+'] = '+
      terms.join(' + ')+'<br>= <b style="color:#00d4ff">'+cur.toFixed(2)+'</b>';
    m.update({kname, out:cur, moved});
  }

  function pick(ev){
    const c = L.toCanvas(ev);
    const cc = Math.floor((c.x - iox)/icell), rr = Math.floor((c.y - ioy)/icell);
    if(cc<0||rr<0||cc>=N||rr>=N) return;
    const nr = Math.max(0, Math.min(ON-1, rr)), nc = Math.max(0, Math.min(ON-1, cc));
    if(nr!==sel.r || nc!==sel.c) moved = true;
    sel = {r:nr, c:nc}; draw();
  }
  let hovering=false;
  L.canvas.addEventListener('pointerdown', e=>{ hovering=true; L.canvas.setPointerCapture(e.pointerId); pick(e); });
  L.canvas.addEventListener('pointermove', e=>{ if(hovering) pick(e); });
  L.canvas.addEventListener('pointerup', ()=>{ hovering=false; });

  const krow = chips(L.ctrl, 'KERNEL', ['blur','vertical edge','horizontal edge'], (i,btn,row)=>{
    kname = ['blur','vedge','hedge'][i];
    [...row.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); moved=true; draw();
  });
  krow.children[1].classList.add('on');
  const note = document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">Hover (or drag) over the input to move the <b style="color:#7c5cff">3x3 window</b>. The output heat is <b style="color:#ff6a76">warm</b> for positive responses and <b style="color:#6a8bff">cool</b> for negative. Vertical-edge fires on the square\'s left/right sides; horizontal-edge on its top/bottom; blur just softens.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ---------- Lab A3 — stride, padding & output size ---------- */
INTERACTIVES['conv-stride-pad'] = function(stage, api){
  const L = makeLab(stage, {h:430});
  const ctx = L.ctx, W = L.W, H = L.H;
  let n=7, k=3, s=1, p=0;
  const outSize = () => Math.floor((n - k + 2*p) / s) + 1;

  const m = api.missions([
    {text:'Build a <b>same</b> convolution: with k=3, stride 1, choose padding so the output size <b>equals</b> the input size', xp:22,
      check:st => st.k===3 && st.s===1 && st.out===st.n && st.p===1},
    {text:'Hit an output size of <b>exactly 5</b> (any legal combination of n, k, s, p)', xp:20,
      check:st => st.out===5},
    {text:'<b>Downsample</b> with a stride of <b>2 or more</b> and confirm the output shrinks below the input', xp:18,
      check:st => st.s>=2 && st.out < st.n},
  ]);

  function draw(){
    clearBg(ctx, W, H);
    const padded = n + 2*p;
    const cell = Math.min(30, Math.floor(430 / Math.max(padded, 9)));
    const gx = 40, gy = 70;
    ctx.font='700 13px '+FONT(); ctx.textAlign='left'; ctx.fillStyle='#cdd4f0';
    ctx.fillText('input '+n+' (with padding '+p+' -> '+padded+')', gx, gy-16);
    for(let c=0;c<padded;c++){
      const isPad = c < p || c >= padded - p;
      ctx.fillStyle = isPad ? 'rgba(255,255,255,.08)' : 'rgba(45,212,160,.55)';
      ctx.fillRect(gx + c*cell, gy, cell-2, cell-2);
      ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.lineWidth=1;
      ctx.strokeRect(gx + c*cell, gy, cell-2, cell-2);
    }
    const nout = outSize();
    const wy = gy + cell + 22;
    ctx.fillStyle='#cdd4f0'; ctx.fillText('kernel windows (one per output, stride '+s+')', gx, wy-6);
    for(let o=0;o<nout;o++){
      const start = o*s;
      const y = wy + 6 + o*10;
      if(y > H-40) break;
      ctx.strokeStyle='#ffc94d'; ctx.lineWidth=2;
      ctx.strokeRect(gx + start*cell, y, cell*k - 2, 8);
    }
    L.readout.innerHTML='n = '+n+', k = '+k+', stride = '+s+', padding = '+p+'<br>'+
      'n_out = floor((n - k + 2p)/s) + 1 = floor(('+n+' - '+k+' + '+(2*p)+')/'+s+') + 1<br>'+
      '= <b style="color:#ffc94d">'+nout+'</b>'+(nout===n?'  (same size!)':'')+(s>=2?'  (downsampled)':'');
    m.update({n,k,s,p,out:nout});
  }
  slider(L.ctrl,'input size n',4,12,1,7,v=>''+v,v=>{ n=v; if(k>n){k=n;} draw(); });
  slider(L.ctrl,'kernel size k',1,5,1,3,v=>''+v,v=>{ k=Math.min(v,n); draw(); });
  slider(L.ctrl,'stride s',1,3,1,1,v=>''+v,v=>{ s=v; draw(); });
  slider(L.ctrl,'padding p',0,3,1,0,v=>''+v,v=>{ p=v; draw(); });
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#2dd4a0">Green</b> = real input pixels, <b style="color:#8b93b8">grey</b> = zero-padding. Each <b style="color:#ffc94d">gold bar</b> is one kernel window; count them and you have the output size. For "same" output, pad by (k-1)/2.</div>';
  L.ctrl.appendChild(note);
  draw();
  api.predict({
    prompt:'For input n = 7, kernel k = 3, stride s = 2, padding p = 0, how many outputs does the convolution produce?',
    choices:['3','4','2','5'],
    answer:0,
    reveal:'\\( \\lfloor (7 - 3 + 0)/2 \\rfloor + 1 = \\lfloor 4/2 \\rfloor + 1 = 2 + 1 = 3 \\). The stride-2 kernel starts at positions 0, 2, 4 &mdash; three windows &mdash; so the output has 3 values. Set the sliders to check.'
  });
};

/* ================================================================
   LESSON B — ml-cnn : Feature Hierarchies: Why CNNs See
   ================================================================ */
registerLesson({
  id:'ml-cnn', world:'ml', order:51.6, emoji:'🧅',
  title:'Feature Hierarchies: Why CNNs See',
  sub:'Stack convolutions and simple edge detectors compose into corners, textures and eventually whole objects. Pooling and weight sharing supply the right inductive bias for images.',
  learn:`<p>One convolution finds simple features &mdash; edges, blobs of colour. The magic of a <strong>convolutional neural network (CNN)</strong> is what happens when you <strong>stack</strong> them. A layer-2 filter does not look at raw pixels; it looks at the <em>feature maps produced by layer 1</em>. So it can combine, say, a vertical-edge response and a horizontal-edge response that overlap at a point into a <strong>corner</strong> detector. Layer 3 combines corners into <strong>textures and parts</strong>; deeper still, parts into <strong>objects</strong>. This is the <strong>feature hierarchy</strong>, and it is learned end-to-end, not hand-designed.</p>
  <p>Depth also grows the <strong>receptive field</strong> &mdash; the patch of the original image a single deep unit can "see". Each 3&times;3 layer widens it by 2, so \\(L\\) stacked 3&times;3 layers give a receptive field of \\(1 + 2L\\). A famous consequence: <strong>two stacked 3&times;3 convolutions cover a 5&times;5 receptive field</strong>, but with two small kernels (18 weights per channel) instead of one big 5&times;5 kernel (25 weights) &mdash; and with an extra nonlinearity in between. This "small kernels, more depth" recipe is why VGG-style networks stack 3&times;3s.</p>
  <div class="formula">$$\\text{RF after } L \\text{ layers of } 3\\times3 \\text{ (stride 1)} = 1 + 2L$$</div>
  <p>Two more ideas complete the picture, and they are precise, so state them precisely:</p>
  <p>&bull; <strong>Translation equivariance</strong> (convolution): shift the input, and the output feature map shifts by the same amount. Formally, convolution <em>commutes</em> with translation. It is <em>equivariant</em>, NOT invariant &mdash; the response moves, it does not stay put.<br>
  &bull; <strong>Pooling</strong> adds a little translation <em>invariance</em>. <strong>Max-pooling</strong> takes the maximum over a small window (e.g. 2&times;2) and keeps only that, discarding <em>where</em> inside the window the max sat. Shift the input a little and the max often lands in the same pool, so the pooled output is unchanged &mdash; but shift it across a pool boundary and it does change. So pooling buys <em>partial</em> invariance, and it throws away exact position to do so.</p>
  <p>Why is all of this the <strong>right inductive bias</strong> for images? Because a useful feature (an edge, an eye) is useful <em>wherever</em> it appears, so it is wasteful to learn a separate detector per position (that is what an MLP does). Weight sharing encodes "the same feature can occur anywhere" and locality encodes "nearby pixels form features". Those two priors are exactly true of natural images, which is why CNNs generalise from far less data than a fully-connected net on the same task.</p>`,
  ml:`The feature-hierarchy story is not just a metaphor &mdash; feature-visualization work (distill.pub) literally renders what units at each depth respond to, and you see edges -> textures -> patterns -> objects as you go deeper. CNNs powered the deep-learning explosion: AlexNet's 2012 ImageNet win was a CNN. The modern caveat: many recent architectures drop max-pooling in favour of <b>strided convolution</b> for downsampling (learnable, and it keeps everything one operation), and Vision Transformers replace convolution's hard locality prior with attention &mdash; but they need far more data precisely because they throw that helpful bias away.`,
  deeper:[
   {title:'😵 Stuck? The bricklayer view', body:'Think of building with bricks. Layer 1 makes bricks (edges). Layer 2 lays bricks into walls (corners, curves). Layer 3 assembles walls into rooms (textures, parts). No single layer sees the whole house; each just recombines the layer below. That recombination is all a deeper filter does &mdash; it weights and sums the maps beneath it, then applies a nonlinearity.'},
   {title:'🚀 Go deeper: equivariant vs invariant (get this right)', body:'Convolution is <b>equivariant</b> to translation: \\(\\text{conv}(\\text{shift}(x)) = \\text{shift}(\\text{conv}(x))\\). Move the cat, the "cat-ear" activation moves with it. Pooling then adds a dash of <b>invariance</b>: after max-pooling, small shifts of the input leave the pooled output unchanged, so the network can recognise the cat-ear whether it is one pixel left or right. Equivariance preserves <em>where</em>; invariance deliberately forgets a little of it. Goodfellow, Bengio &amp; Courville, <em>Deep Learning</em> (2016), Ch.&nbsp;9, is the careful reference.'},
   {title:'🚀 Go deeper: the 2012 moment', body:'CNNs existed for two decades before they took over. What changed in 2012: Krizhevsky, Sutskever &amp; Hinton\'s <b>AlexNet</b> ("ImageNet Classification with Deep Convolutional Neural Networks", NeurIPS 2012) cut the ImageNet top-5 error nearly in half using a deep CNN trained on two GPUs with ReLU and dropout. It is the paper that kicked off the modern deep-learning era &mdash; and it is just this lesson, scaled up.'},
   {title:'🚀 Go deeper: do we still need pooling?', body:'Not necessarily. Springenberg et&nbsp;al., "Striving for Simplicity: The All Convolutional Net" (2015), showed you can replace max-pooling with a <b>stride-2 convolution</b> and match or beat accuracy &mdash; the network learns its own downsampling instead of using a fixed max. Many modern nets (ResNet variants) downsample with strided convs for exactly this reason. Pooling is not sacred; it is one cheap, hand-designed way to buy invariance and shrink the map.'}],
  labs:[
    {key:'cnn-hierarchy', title:'Stacking layers: from edges to corners',
     intro:'<p>A layer-2 unit sees the <b>feature maps</b> of layer 1, not raw pixels. Pick which two layer-1 edge maps combine to fire on a <b>corner</b>, then use the depth slider to watch the <b>receptive field</b> grow &mdash; \\(1 + 2L\\) for \\(L\\) stacked 3&times;3 layers, so two layers already cover 5&times;5.</p>',
     interactive:'cnn-hierarchy'},
    {key:'cnn-pool', title:'Pooling & partial invariance',
     intro:'<p>Max-pool a feature map with 2&times;2 windows, then shift the input one pixel at a time. Predict first: does the pooled output change? You will find it is <b>partly</b> invariant &mdash; shifts within a pool are absorbed, shifts across a pool boundary are not. Note what pooling throws away: the exact position of the max.</p>',
     interactive:'cnn-pool'},
    {key:'cnn-params', title:'Why sharing wins: a parameter count',
     intro:'<p>Put a fully-connected layer and a convolutional layer side by side on the same 32&times;32 image and read off their weight counts. The FC layer needs a weight per (pixel, unit) pair; the conv layer reuses one small kernel everywhere. Watch the gap explode as the image grows &mdash; that is locality plus weight sharing paying for itself.</p>',
     interactive:'cnn-params'},
  ],
  quiz:[
   {q:'In a CNN, what do early layers versus deep layers tend to detect?',
    opts:['Early: simple edges/blobs; deep: complex parts, textures and objects',
          'Early: whole objects; deep: single pixels',
          'Early: nothing useful; deep: everything',
          'Early: colour only; deep: edges only'],
    a:0, tag:'feature hierarchy',
    focus:'Edges -> corners/textures -> parts -> objects, shallow to deep. Deeper filters recombine the maps below.',
    why:'A deep filter sees the feature maps beneath it, so it composes simple features (edges) into progressively more complex ones (corners, textures, objects).',
    wrong:{1:'It is the other way around: whole objects emerge in DEEP layers, built from the simple features found early.',
           2:'Early layers detect very useful primitives (edges); nothing about a CNN is "nothing useful".',
           3:'Both colour and edges are simple early features; the depth axis is simple-to-complex, not colour-to-edge.'}},
   {q:'As you stack more convolutional layers, the effective receptive field of a deep unit…',
    opts:['Grows &mdash; deeper units see larger regions of the input',
          'Shrinks with depth',
          'Stays 3&times;3 forever',
          'Covers the entire image after a single layer'],
    a:0, tag:'receptive field growth',
    focus:'Each 3x3 layer widens the receptive field by 2: RF = 1 + 2L. Depth = bigger view.',
    why:'Each layer looks at a window of the layer below, so seeing through the stack compounds: the receptive field grows with depth (1 + 2L for 3x3 layers).',
    wrong:{1:'Depth compounds the windows, so the field grows, never shrinks.',
           2:'One layer is 3x3, but stacking widens it &mdash; that is the whole point of depth.',
           3:'A single 3x3 layer sees only a 3x3 patch; whole-image coverage takes many layers (or global pooling).'}},
   {q:'Two stacked 3&times;3 convolution layers (stride 1) have a receptive field of…',
    opts:['5&times;5, using fewer weights than one 5&times;5 layer',
          '3&times;3, same as a single layer',
          '9&times;9',
          '25&times;25'],
    a:0, tag:'stacked 3x3 vs 5x5',
    focus:'1 + 2L with L=2 gives 5. Two 3x3s = 18 weights/channel vs 25 for one 5x5, plus an extra nonlinearity.',
    why:'RF = 1 + 2(2) = 5, so two 3x3 layers cover 5x5 &mdash; with 18 weights per channel instead of 25, and an extra ReLU between them. This is the VGG recipe.',
    wrong:{1:'Stacking two layers strictly grows the field beyond one layer\'s 3x3.',
           2:'9x9 would need four stacked 3x3 layers (1 + 2*4 = 9), not two.',
           3:'25x25 is far too large; that is 12 stacked 3x3 layers.'}},
   {type:'numeric',
    q:'Stacking L layers of 3&times;3 convolution (stride 1) gives an effective receptive field of width 1 + 2L. For L = 4 layers, what is the receptive-field width?',
    answer:9, tol:0.5, tag:'receptive field growth',
    focus:'Plug L=4 into 1 + 2L.',
    hint:'1 + 2L with L = 4 gives 1 + 8 = 9.',
    why:'1 + 2(4) = 9. Four stacked 3x3 layers see a 9x9 patch of the input &mdash; equivalent coverage to a single 9x9 kernel, but with far fewer parameters and three extra nonlinearities.'},
   {q:'Convolution is translation-EQUIVARIANT. Concretely this means: shift the input, and the output feature map…',
    opts:['Shifts by the same amount',
          'Stays exactly identical',
          'Changes unpredictably',
          'Disappears'],
    a:0, tag:'translation equivariance',
    focus:'Equivariant = the response MOVES with the input. Invariant would mean it stays put. Do not confuse them.',
    why:'Because the kernel is reused at every position, moving the input by k pixels moves every response by k pixels: conv(shift(x)) = shift(conv(x)). That is equivariance.',
    wrong:{1:'Staying identical is INVARIANCE, which convolution alone does not provide &mdash; pooling adds a little of that.',
           2:'The change is completely predictable: the map shifts by exactly the input shift.',
           3:'The feature does not vanish; it relocates to track the input.'}},
   {q:'Max-pooling contributes what, and by what mechanism?',
    opts:['A little translation invariance, by keeping only the max in each window (discarding exact position)',
          'Translation equivariance, by flipping the image',
          'More invariance, by adding trainable parameters',
          'Higher resolution, by upsampling'],
    a:0, tag:'pooling invariance',
    focus:'Max-pool keeps the max, forgets where it was inside the window -> partial shift invariance. It has zero parameters.',
    why:'Taking the max over a window and dropping its location means small shifts (that keep the max in the same pool) leave the output unchanged &mdash; partial invariance, bought by throwing away exact position.',
    wrong:{1:'Pooling does not flip anything, and flipping is unrelated to equivariance.',
           2:'Max-pooling has NO trainable parameters &mdash; that is part of its appeal.',
           3:'Pooling downsamples (lower resolution), it does not upsample.'}},
   {q:'A common modern alternative to max-pooling for downsampling a feature map is…',
    opts:['Strided convolution (a learnable downsampler)',
          'A larger fully-connected layer',
          'Removing all nonlinearities',
          'Adding more zero-padding'],
    a:0, tag:'strided conv vs pooling',
    focus:'Strided conv learns its own downsampling; the All-Conv Net showed it can replace max-pool.',
    why:'A stride-2 convolution shrinks the map like pooling but is learnable, so many modern nets use it instead of a fixed max operation.',
    wrong:{1:'A big FC layer explodes the parameter count &mdash; the opposite of an efficient downsampler.',
           2:'Removing nonlinearities collapses the network to a single linear map; it does not downsample.',
           3:'Padding keeps or grows the size; it does not downsample.'}},
   {type:'numeric',
    q:'A fully-connected layer mapping a 32&times;32 image (1024 pixels) to 100 hidden units has how many WEIGHT parameters (ignore biases)?',
    answer:102400, tol:1, tag:'parameter count',
    focus:'FC weights = inputs * units = (32*32) * 100.',
    hint:'32*32 = 1024 inputs, each connected to all 100 units: 1024 * 100 = 102400.',
    why:'A fully-connected layer has one weight per (input, unit) pair: 1024 * 100 = 102400. A single 3x3 conv filter, by contrast, has just 9 &mdash; reused at every pixel. That gap is the whole argument for convolution on images.'},
   {q:'Why are weight sharing and locality the RIGHT inductive bias for images?',
    opts:['A useful feature (like an edge) is useful anywhere, so reuse one detector everywhere and look only locally',
          'Because images have no spatial structure to exploit',
          'Because fully-connected layers are always more accurate',
          'Because pixels are statistically independent'],
    a:0, tag:'inductive bias',
    focus:'Priors that match reality: features recur anywhere (sharing) and form from nearby pixels (locality). Right bias -> less data needed.',
    why:'Natural images really do have features that can appear anywhere and that are built from neighbouring pixels. Encoding those two facts as priors lets a CNN generalise from far less data than an MLP.',
    wrong:{1:'Images have enormous spatial structure &mdash; that structure is exactly what these priors exploit.',
           2:'On images a fully-connected layer usually needs far more data and overfits; it is generally worse, not better.',
           3:'Neighbouring pixels are highly correlated, not independent &mdash; which is why locality helps.'}},
   {type:'order',
    q:'Arrange the operations of one typical CNN block in the order they are applied:',
    tag:'feature hierarchy',
    steps:['Convolve the input with a bank of learned filters',
           'Apply a ReLU nonlinearity to each resulting feature map',
           'Downsample with max-pooling (or a strided conv)',
           'Pass the smaller maps on to the next block'],
    why:'Convolve to extract features, ReLU to add nonlinearity, pool to shrink and buy a little invariance, then hand the result to the next block. Stack these and the feature hierarchy emerges.'},
  ],
});

/* ---------- Lab B1 — feature hierarchy & receptive field ---------- */
INTERACTIVES['cnn-hierarchy'] = function(stage, api){
  const L = makeLab(stage, {h:450});
  const ctx = L.ctx, W = L.W, H = L.H;
  const MAPS = ['vertical edge','horizontal edge','diagonal'];
  const sel = new Set();
  let depth = 1;
  const rf = () => 1 + 2*depth;
  const cornerFires = () => sel.has(0) && sel.has(1) && sel.size===2;

  const m = api.missions([
    {text:'A layer-2 <b>corner detector</b> fires where two perpendicular edges meet. Pick the <b>two</b> layer-1 maps that build the corner', xp:24,
      check:s => s.corner},
    {text:'Grow the <b>receptive field</b>: stack layers until a deep unit sees a <b>7&times;7</b> patch or larger', xp:20,
      check:s => s.rf >= 7},
    {text:'Confirm the classic fact: <b>two stacked 3&times;3 layers = a 5&times;5</b> receptive field. Set depth to 2', xp:16,
      check:s => s.depth===2 && s.rf===5},
  ]);

  const G=5; const corner=(r,c)=> (c===0 || r===G-1) ? 0.9 : 0.12;
  function draw(){
    clearBg(ctx, W, H);
    ctx.textAlign='left'; ctx.font='700 13px '+FONT();
    ctx.fillStyle='#cdd4f0'; ctx.fillText('input (a corner)', 30, 46);
    const ix=30, iy=56, cell=22;
    for(let r=0;r<G;r++) for(let c=0;c<G;c++){ const g=Math.round(corner(r,c)*255); ctx.fillStyle='rgb('+g+','+g+','+g+')'; ctx.fillRect(ix+c*cell, iy+r*cell, cell-1, cell-1); }
    ctx.fillStyle='#cdd4f0'; ctx.font='700 13px '+FONT(); ctx.fillText('layer-1 feature maps (click to combine)', 200, 46);
    const px=200, py=56, pw=120, ph=34, gap=12;
    MAPS.forEach((name,i)=>{
      const y=py + i*(ph+gap);
      const on = sel.has(i);
      ctx.fillStyle = on ? 'rgba(45,212,160,.85)' : 'rgba(255,255,255,.08)';
      ctx.fillRect(px, y, pw, ph);
      ctx.strokeStyle = on ? '#2dd4a0' : 'rgba(255,255,255,.2)'; ctx.lineWidth=2; ctx.strokeRect(px, y, pw, ph);
      ctx.fillStyle = on ? '#04231a' : '#cdd4f0'; ctx.font='700 12px '+FONT();
      ctx.fillText((on?'* ':'')+name, px+8, y+ph/2+4);
    });
    const lit = cornerFires();
    const lx=360, ly=py + (ph+gap);
    ctx.fillStyle = lit ? 'rgba(255,201,77,.9)' : 'rgba(255,255,255,.08)';
    ctx.fillRect(lx, ly, 150, 44);
    ctx.strokeStyle = lit ? '#ffc94d' : 'rgba(255,255,255,.2)'; ctx.lineWidth=2.5; ctx.strokeRect(lx, ly, 150, 44);
    ctx.fillStyle = lit ? '#2b1d00' : '#8b93b8'; ctx.font='700 13px '+FONT();
    ctx.fillText(lit ? 'corner detected!' : 'layer-2: corner?', lx+12, ly+27);
    sel.forEach(i=>{ const y=py + i*(ph+gap) + ph/2; ctx.strokeStyle='rgba(255,201,77,.6)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(px+pw, y); ctx.lineTo(lx, ly+22); ctx.stroke(); });

    const gy=232; ctx.fillStyle='#cdd4f0'; ctx.font='700 13px '+FONT();
    ctx.fillText('receptive field after '+depth+' layer'+(depth>1?'s':'')+' of 3x3:  1 + 2L = '+rf(), 30, gy-8);
    const show=Math.min(rf(), 9), rc=22, gx=30, gyy=gy+6;
    for(let r=0;r<9;r++) for(let c=0;c<9;c++){
      const inRf = r < show && c < show;
      ctx.fillStyle = inRf ? 'rgba(124,92,255,.55)' : 'rgba(255,255,255,.05)';
      ctx.fillRect(gx+c*rc, gyy+r*rc, rc-2, rc-2);
    }
    L.readout.innerHTML = 'selected layer-1 maps: <b>'+(sel.size? [...sel].map(i=>MAPS[i]).join(' + ') : '(none)')+'</b><br>'+
      'layer-2 corner detector: <b style="color:'+(lit?'#ffc94d':'#8b93b8')+'">'+(lit?'FIRING':'silent')+'</b><br>'+
      'receptive field = <b style="color:#b9a8ff">'+rf()+'x'+rf()+'</b>';
    m.update({corner:cornerFires(), rf:rf(), depth});
  }
  chips(L.ctrl, 'COMBINE LAYER-1 MAPS', MAPS, (i,btn)=>{
    if(sel.has(i)){ sel.delete(i); btn.classList.remove('on'); } else { sel.add(i); btn.classList.add('on'); }
    draw();
  });
  slider(L.ctrl, 'network depth (stacked 3x3 layers)', 1, 5, 1, 1, v=>'L = '+v, v=>{ depth=v; draw(); });
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The corner is a vertical stroke meeting a horizontal stroke, so it needs <b>both</b> the vertical- and horizontal-edge maps. The <b style="color:#b9a8ff">purple square</b> is how much of the input one deep unit can see &mdash; it grows by 2 with every 3x3 layer.</div>';
  L.ctrl.appendChild(note);
  draw();
};

/* ---------- Lab B2 — pooling & partial invariance ---------- */
INTERACTIVES['cnn-pool'] = function(stage, api){
  const L = makeLab(stage, {h:430});
  const ctx = L.ctx, W = L.W, H = L.H;
  const N=6;
  let hot = {r:2, c:1};
  const val = (r,c) => (r===hot.r && c===hot.c) ? 1 : 0.08;
  function pooled(){
    const out=[]; for(let pr=0;pr<3;pr++){ out[pr]=[]; for(let pc=0;pc<3;pc++){
      let mx=0; for(let i=0;i<2;i++) for(let j=0;j<2;j++) mx=Math.max(mx, val(pr*2+i, pc*2+j));
      out[pr][pc]=mx; } } return out;
  }
  let prev = JSON.stringify(pooled());
  let sawSame=false, sawChange=false, shifts=0;

  const m = api.missions([
    {text:'Shift the input and find a move where the pooled map is <b>UNCHANGED</b> (a shift within one pool)', xp:22,
      check:s => s.sawSame},
    {text:'Now find a shift where the pooled map <b>DOES change</b> (crossing a pool boundary) &mdash; invariance is only partial', xp:22,
      check:s => s.sawChange},
    {text:'Shift at least <b>4 times</b> total to feel the pattern of absorbed vs propagated shifts', xp:14,
      check:s => s.shifts >= 4},
  ]);

  function grid(ox, oy, cell, rows, cols, getv, hi){
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const v=getv(r,c); const g=Math.round(30 + v*225);
      ctx.fillStyle = v>0.5 ? 'rgb(255,'+Math.round(120+v*100)+',60)' : 'rgb('+g+','+g+','+g+')';
      ctx.fillRect(ox+c*cell, oy+r*cell, cell-2, cell-2);
      if(hi && hi(r,c)){ ctx.strokeStyle='#00d4ff'; ctx.lineWidth=2; ctx.strokeRect(ox+c*cell, oy+r*cell, cell-2, cell-2); }
    }
  }
  function draw(){
    clearBg(ctx, W, H);
    ctx.textAlign='left'; ctx.font='700 13px '+FONT(); ctx.fillStyle='#cdd4f0';
    ctx.fillText('feature map (6x6) with a bright activation', 30, 40);
    ctx.fillText('after 2x2 max-pool (3x3)', 400, 40);
    const ix=30, iy=52, ic=48;
    grid(ix, iy, ic, N, N, val, (r,c)=> r===hot.r && c===hot.c);
    ctx.strokeStyle='rgba(124,92,255,.8)'; ctx.lineWidth=2;
    for(let b=0;b<=N;b+=2){ ctx.beginPath(); ctx.moveTo(ix+b*ic, iy); ctx.lineTo(ix+b*ic, iy+N*ic); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ix, iy+b*ic); ctx.lineTo(ix+N*ic, iy+b*ic); ctx.stroke(); }
    const pv=pooled();
    grid(400, 52, 56, 3, 3, (r,c)=>pv[r][c]);
    const changed = JSON.stringify(pv)!==prev;
    L.readout.innerHTML='hot pixel at [row '+hot.r+', col '+hot.c+'], in pool cell [row '+Math.floor(hot.r/2)+', col '+Math.floor(hot.c/2)+']<br>'+
      'shifts so far: <b>'+shifts+'</b>'+(shifts>0 ? '  &middot; last shift '+(changed?'<b style="color:#ff6a76">CHANGED the pooled map</b>':'<b style="color:#2dd4a0">left the pooled map UNCHANGED</b>') : '');
    m.update({sawSame, sawChange, shifts});
  }
  function shift(){
    const before = JSON.stringify(pooled());
    hot.c = (hot.c + 1) % N;
    const after = JSON.stringify(pooled());
    if(after===before) sawSame=true; else sawChange=true;
    prev = after; shifts++; draw();
  }
  const row=document.createElement('div'); row.className='ctrl';
  const bb=document.createElement('div'); bb.className='chipbtns';
  const sb=document.createElement('button'); sb.className='chip'; sb.textContent='Shift input right 1px';
  const rb=document.createElement('button'); rb.className='chip'; rb.textContent='Reset';
  sb.onclick=shift; rb.onclick=()=>{ hot={r:2,c:1}; prev=JSON.stringify(pooled()); shifts=0; draw(); };
  bb.appendChild(sb); bb.appendChild(rb); row.appendChild(bb); L.ctrl.appendChild(row);
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0"><b style="color:#7c5cff">Purple lines</b> mark the 2x2 pools. Max-pool keeps only the brightest value in each pool and forgets <em>where</em> it sat. Shifting the hot pixel <em>inside</em> a pool changes nothing downstream; shifting it <em>across</em> a boundary does. That is partial invariance.</div>';
  L.ctrl.appendChild(note);
  draw();
  api.predict({
    prompt:'You <b>max-pool</b> this map with 2&times;2 windows, then shift the input <b>1 pixel</b>. Does the pooled output change?',
    choices:['Sometimes yes, sometimes no &mdash; pooling is only <b>partly</b> shift-invariant','No, never &mdash; it is perfectly invariant','Yes, always &mdash; it shifts by 1 too','It becomes all zeros'],
    answer:0,
    reveal:'Pooling gives <b>partial</b> invariance. Move the hot pixel <em>within</em> a 2&times;2 pool and the max (so the pooled value) is unchanged; move it <em>across</em> a pool boundary and the max jumps to the neighbouring cell. Small shifts are often absorbed &mdash; but not always.'
  });
};

/* ---------- Lab B3 — parameter count: FC vs conv ---------- */
INTERACTIVES['cnn-params'] = function(stage, api){
  const L = makeLab(stage, {h:400});
  const ctx = L.ctx, W = L.W, H = L.H;
  let Nsz=32, hid=100, cout=1;
  const fcParams = () => Nsz*Nsz*hid + hid;
  const convParams = () => (3*3*1 + 1)*cout;

  const m = api.missions([
    {text:'Push the image to <b>64&times;64</b> with <b>256+</b> hidden units and watch the FC layer blow past <b>1,000,000</b> parameters', xp:22,
      check:s => s.n===64 && s.hid>=256 && s.fc>1e6},
    {text:'Confirm the conv layer stays tiny: set it to <b>8 filters</b> and read a parameter count under <b>100</b>', xp:20,
      check:s => s.cout===8 && s.conv<100},
    {text:'Read the ratio: get the FC-to-conv parameter ratio above <b>10,000x</b>', xp:16,
      check:s => s.ratio > 1e4},
  ]);

  function fmt(x){ return x.toLocaleString('en-US'); }
  function bar(y, label, val, maxLog, col){
    const gx=40, gw=560;
    ctx.fillStyle='#cdd4f0'; ctx.font='700 13px '+FONT(); ctx.textAlign='left';
    ctx.fillText(label, gx, y-8);
    const lw = Math.max(0.02, Math.log10(Math.max(val,1)) / maxLog);
    ctx.fillStyle='rgba(255,255,255,.08)'; ctx.fillRect(gx, y, gw, 30);
    ctx.fillStyle=col; ctx.fillRect(gx, y, gw*lw, 30);
    ctx.fillStyle='#0a0e1f'; ctx.font='700 14px '+FONT();
    ctx.fillText(fmt(val)+' params', gx+10, y+21);
  }
  function draw(){
    clearBg(ctx, W, H);
    const fc=fcParams(), cv=convParams(), maxLog=Math.log10(Math.max(fc, 100));
    ctx.fillStyle='#cdd4f0'; ctx.font='700 14px '+FONT(); ctx.textAlign='left';
    ctx.fillText('Same task, same '+Nsz+'x'+Nsz+' image, two first layers:', 40, 40);
    bar(90, 'Fully-connected  ('+(Nsz*Nsz)+' inputs x '+hid+' units)', fc, maxLog, '#ff5c7a');
    bar(170, 'Convolution  ('+cout+' filter'+(cout>1?'s':'')+' of 3x3, reused everywhere)', cv, maxLog, '#2dd4a0');
    const ratio = fc/cv;
    ctx.fillStyle='#ffc94d'; ctx.font='700 16px '+FONT();
    ctx.fillText('FC uses '+Math.round(ratio).toLocaleString('en-US')+'x more parameters', 40, 250);
    ctx.fillStyle='#8b93b8'; ctx.font='600 12.5px '+FONT();
    ctx.fillText('...and the conv count barely moves as the image grows. That is weight sharing.', 40, 274);
    L.readout.innerHTML='FC weights = '+Nsz+'*'+Nsz+'*'+hid+' + '+hid+' = <b style="color:#ff5c7a">'+fmt(fc)+'</b><br>'+
      'conv weights = (3*3 + 1)*'+cout+' = <b style="color:#2dd4a0">'+fmt(cv)+'</b><br>'+
      'ratio = <b style="color:#ffc94d">'+Math.round(ratio).toLocaleString('en-US')+'x</b>';
    m.update({n:Nsz, hid, cout, fc, conv:cv, ratio});
  }
  slider(L.ctrl, 'image size N (N x N)', 16, 64, 16, 32, v=>v+'x'+v, v=>{ Nsz=v; draw(); });
  slider(L.ctrl, 'FC hidden units', 50, 400, 10, 100, v=>''+v, v=>{ hid=v; draw(); });
  slider(L.ctrl, 'conv output channels (filters)', 1, 16, 1, 1, v=>''+v, v=>{ cout=v; draw(); });
  const note=document.createElement('div'); note.className='ctrl';
  note.innerHTML='<div style="font-size:13px;line-height:1.6;color:#cdd4f0">The <b style="color:#ff5c7a">FC</b> layer needs one weight per (pixel, unit) pair, so it scales with the image area. The <b style="color:#2dd4a0">conv</b> layer reuses one 3x3 kernel at every pixel, so its count depends only on the number of filters &mdash; not the image size. Locality + sharing = the right bias for images.</div>';
  L.ctrl.appendChild(note);
  draw();
};
