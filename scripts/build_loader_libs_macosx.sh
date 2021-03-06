#!/bin/sh

topdir=`pwd`
installdir=`pwd`/third_party/local
c_compiler=mpicc
cxx_compiler=mpicxx
cmake_bin=cmake

set -e

function clean_install_dir {
	rm -rf ${installdir}
}

function build_tp {
	#
	# TextParser
	#
	cd third_party/ 
	cd TextParser/
	if [ -f "Makefile" ]; then
		make distclean
	fi

	autoreconf -ivf

	rm -rf BUILD_DIR
	mkdir -p BUILD_DIR
	cd BUILD_DIR

	# Assume CXX and CC is set to use MPI compiler.
	CXX=${cxx_compiler} CC=${c_compiler} ../configure --prefix=${installdir}/TextParser && make && make install
	cd ${topdir}
}

function build_netcdf {

        # HDF5-1.8.10-patch1 failed to compile on MacOSX. Use `brew install hdf5` instead
	#cd third_party/
	#rm -rf hdf5-1.8.10-patch1/
	#tar -jxvf hdf5-1.8.10-patch1.tar.bz2
	#cd hdf5-1.8.10-patch1
	#CXX=${cxx_compiler} CC=${c_compiler} ./configure --without-szlib --prefix=${installdir} && make && make install
	#cd ${topdir}

	cd third_party/
	rm -rf netcdf-c-netcdf-4.2.1.1/
	tar -zxvf netcdf-c-netcdf-4.2.1.1.tar.gz
	cd netcdf-c-netcdf-4.2.1.1/
	autoreconf -ivf
	CXX=${cxx_compiler} CC=${c_compiler} CPPFLAGS=-I${installdir}/include LDFLAGS=-L${installdir}/lib ./configure --enable-netcdf4 --disable-dap --with-curl-config=/invalid --disable-shared --prefix=${installdir} && make && make install
	cd ${topdir}

}

function build_cdmlib {
	#
	# CDMlib
	#
	cd third_party/

	rm -rf CDMlib_build
	mkdir -p CDMlib_build
	cd CDMlib_build

	CXX=${cxx_compiler} CC=${c_compiler} CFLAGS=${c_flags} CXXFLAGS=${cxx_flags} ${cmake_bin} -DINSTALL_DIR=${installdir}/CDMlib -Dwith_MPI=yes -Dwith_TP=${installdir}/TextParser -Dwith_NetCDF=${installdir} -Dwith_util=no -Dwith_example=no ../CDMlib && make && make install

	if [[ $? != 0 ]]; then exit $?; fi
	cd ${topdir}
}

function build_polylib {
	#
	# Polylib
	#
	cd third_party/
	cd Polylib/
	if [ -f "Makefile" ]; then
		make distclean
	fi

	autoreconf -ivf

	rm -rf BUILD_DIR
	mkdir -p BUILD_DIR
	cd BUILD_DIR
	
	CXX=${cxx_compiler} CC=${c_compiler} ../configure --prefix=${installdir}/Polylib --with-parser=${installdir}/TextParser && make && make install
	cd ${topdir}
}
 
function build_bcmtools {
	#
	# BCMTools
	#
	cd third_party/
	cd BCMTools/
	if [ -f "Makefile" ]; then
		make distclean
	fi

	autoreconf -ivf

	CXX=${cxx_compiler} CC=${c_compiler} ./configure --prefix=${installdir}/BCMTools --with-parser=${installdir}/TextParser --with-polylib=${installdir}/Polylib && make && make install
	cd ${topdir}
}

function build_hdmlib {
	#
	# HDMlib
	#
	cd third_party/
	cd HDMlib/
	if [ -f "Makefile" ]; then
		make distclean
	fi

	rm -rf BUILD_DIR
	mkdir -p BUILD_DIR
	cd BUILD_DIR

	CXX=${cxx_compiler} CC=${c_compiler} ../configure --prefix=${installdir}/HDMlib --with-parser=${installdir}/TextParser --with-bcm=${installdir}/BCMTools && make && make install
	cd ${topdir}
}

function build_pdmlib {
	cd third_party/
	rm -rf fpzip-1.0.1/
	tar -zxvf fpzip-1.0.1.tar.gz
	cd fpzip-1.0.1/src
	# TODO: Provide our own Makefile
	make
	cd ..
	mkdir -p ${installdir}/include
	mkdir -p ${installdir}/lib
	cp -Rf inc/* ${installdir}/include/
	cp -Rf lib/* ${installdir}/lib/
	cd ${topdir}

	cd third_party/
	rm -rf Zoltan_v3.81/
	rm -rf Zoltan_build/
	tar -zxvf zoltan_distrib_v3.81.tar.gz

        # Apply a patch for perl script(e.g. Newer Perl 5.22 on Ubuntu 16.04 fails to exec without this patch)
        cd Zoltan_v3.81
        patch -p0 < ../zoltan_installscript_patch.diff
        cd ..

	mkdir Zoltan_build
	cd Zoltan_build
	CXX=${cxx_compiler} CC=${c_compiler} ../Zoltan_v3.81/configure --prefix=${installdir} && make && make install
	cd ${topdir}

	#
	# PDMlib
	#
	cd third_party/
	rm -rf PDMlib_build
	mkdir PDMlib_build
	cd PDMlib_build/
        # Don't build converter tools.
	CXX=${cxx_compiler} CC=${c_compiler} ${cmake_bin} -Dwith_TP=${installdir}/TextParser -Dwith_FPZIP=${installdir} -Dwith_ZOLTAN=${installdir} -Dbuild_h5part_converter=no -Dbuild_fv_converter=no -Dbuild_vtk_converter=no -DINSTALL_DIR=${installdir}/PDMlib ../PDMlib && make && make install
	cd ${topdir}
}

function build_udmlib {
	cd third_party/
	rm -rf cgnslib_3.2.1/
	rm -rf cgnslib_build/
	tar -zxvf cgnslib_3.2.1.tar.gz
	mkdir cgnslib_build
	cd cgnslib_build
	# Create .a only(disable .dylib build)
	CXX=${cxx_compiler} CC=${c_compiler} ${cmake_bin} -DCMAKE_INSTALL_PREFIX=${installdir} -DCGNS_ENABLE_64BIT=On -DCGNS_BUILD_SHARED=Off ../cgnslib_3.2.1 && make VERBOSE=1 && make install
	cd ${topdir}

	cd third_party/
	rm -rf Zoltan_v3.81/
	rm -rf Zoltan_build/
	tar -zxvf zoltan_distrib_v3.81.tar.gz

        # Apply a patch for perl script(e.g. Newer Perl 5.22 on Ubuntu 16.04 fails to exec without this patch)
        cd Zoltan_v3.81
        patch -p0 < ../zoltan_installscript_patch.diff
        cd ..

	mkdir Zoltan_build
	cd Zoltan_build
	CXX=${cxx_compiler} CC=${c_compiler} ../Zoltan_v3.81/configure --prefix=${installdir} && make && make install
	cd ${topdir}

	#
	# UDMlib
	#
	cd third_party/UDMlib
	autoreconf -ivf

	rm -rf BUILD_DIR
	mkdir -p BUILD_DIR
	cd BUILD_DIR

	# Work around: Use cxx compiler even for CC to compile example programs.
	CXX=${cxx_compiler} CC=${cxx_compiler} ../configure --prefix=${installdir}/UDMlib --with-tp=${installdir}/TextParser --with-zoltan=${installdir} --with-cgns=${installdir} && make && make install
	if [[ $? != 0 ]]; then exit $?; fi
	cd ${topdir}
}

function build_compositor {

	cd third_party/ 
	cd 234Compositor/
	#if [ -f "Makefile" ]; then
	#	make distclean
	#fi

	CXX=${cxx_compiler} CC=${c_compiler} ./configure --prefix=${installdir}/234Compositor && make && make install
	cd ${topdir}
}

function build_pmlib {

        cd ${topdir}/third_party/PMlib

        autoreconf -ivf
        cd BUILD_DIR
        CXX=${cxx_compiler} CC=${c_compiler} ../configure --prefix=${installdir}/PMlib && make && make install
        if [[ $? != 0 ]]; then exit $?; fi
        cd ${topdir}
}

function build_nanomsg {

	cd third_party/ 
	cd nanomsg/
	#if [ -f "Makefile" ]; then
	#	make distclean
	#fi

	autoreconf -ivf
	CXX=${cxx_compiler} CC=${c_compiler} ./configure --prefix=${installdir}/nanomsg --disable-shared && make && make install
	cd ${topdir}
}

clean_install_dir
build_tp
build_netcdf
build_cdmlib
build_polylib
build_bcmtools
build_hdmlib
build_pdmlib
build_udmlib
build_pmlib
build_compositor
build_nanomsg
